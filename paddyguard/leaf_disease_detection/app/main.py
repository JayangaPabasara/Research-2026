import io
import csv
import json
import sys
import uuid
import base64
import zipfile
import logging
import os
import re
import subprocess
import shutil
import requests
from io import BytesIO
from datetime import datetime

import torch
import torch.nn as nn
from flask import Flask, request, jsonify, g, send_from_directory, send_file
from flask_cors import CORS
from PIL import Image
from torchvision import models as tv_models
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from functools import wraps

from .config import settings
from .ml_service import model_service
from .risk import calculate_risk, severity_label
from .weather import geocode_sri_lanka, get_weather

# Import MongoDB Repositories
from app.repositories.prediction_repository import PredictionRepository
from app.repositories.expert_repository import ExpertRepository
from app.repositories.active_learning_repository import ActiveLearningRepository
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.training_repository import TrainingRepository
from app.repositories.deployment_repository import DeploymentRepository
from app.repositories.user_repository import UserRepository

# Import Cloudinary Service
from app.cloudinary_service import (
    upload_image_to_cloudinary,
    delete_cloudinary_asset
)
from training import model_retention

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Seed DeployedModelRecord in MongoDB
try:
    deployment_repo = DeploymentRepository()
    record = deployment_repo.find_active()
    if not record:
        deployment_repo.create({
            "checkpoint_path": settings.model_path,
            "test_accuracy": 0.9714,
            "macro_f1": 0.9714,
            "notes": "Seeded initial deployment (Round 2)",
            "is_active": True
        })
except Exception as e:
    logger.error(f"Failed to seed DeployedModelRecord in MongoDB: {e}")

# Optionally run a one-time cleanup on startup; non-fatal
try:
    model_retention.run_model_retention_cleanup()
except Exception as e:
    logger.error(f"Model retention startup cleanup failed: {e}")

serializer = URLSafeTimedSerializer(settings.secret_key)

def verify_token_details(token):
    if not token:
        return None, "Token is missing", 401
    try:
        data = serializer.loads(
            token,
            salt="auth-token",
            max_age=settings.auth_token_max_age_seconds
        )
    except SignatureExpired:
        return None, "Token has expired", 401
    except BadSignature:
        return None, "Token is invalid", 401

    username = data.get("username")
    role = data.get("role")
    user_id = data.get("user_id")

    if role == "EXPERT":
        user = ExpertRepository().find_by_username(username)
        if not user or not user.is_active:
            return None, "User account is disabled or does not exist", 403
    elif role == "SUPER_ADMIN":
        if username != settings.super_admin_username:
            return None, "Token is invalid", 401
    elif role == "USER":
        user = UserRepository().find_by_id(user_id)
        if not user or not user.is_active:
            return None, "User account is disabled or does not exist", 403
    else:
        return None, "Invalid role", 401

    return {"username": username, "role": role, "user_id": user_id}, None, None

def token_required(required_role=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = None
            if "Authorization" in request.headers:
                auth_header = request.headers["Authorization"]
                if auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
            
            user_info, err_msg, status_code = verify_token_details(token)
            if err_msg:
                return jsonify({"detail": err_msg}), status_code
                
            role = user_info["role"]
            if required_role == "SUPER_ADMIN" and role != "SUPER_ADMIN":
                return jsonify({"detail": "Access forbidden: Super Admin role required"}), 403
                
            if required_role == "EXPERT" and role not in ["EXPERT", "SUPER_ADMIN"]:
                return jsonify({"detail": "Access forbidden: Expert or Super Admin role required"}), 403

            if required_role == "USER" and role not in ["USER", "EXPERT", "SUPER_ADMIN"]:
                return jsonify({"detail": "Access forbidden: User role required"}), 403
                
            g.current_user = user_info
            return f(*args, **kwargs)
        return decorated
    return decorator

def get_top_k_candidates():
    repo = PredictionRepository()
    return repo.find_top_k_candidates(limit=5)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
app.config['GRADCAM_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "gradcam")

# Configure CORS
# Allow all localhost ports in development, plus configured FRONTEND_ORIGIN
allowed_origins = [
    re.compile(r"^http://localhost:\d+$"),
    re.compile(r"^http://127\.0\.0\.1:\d+$"),
]
if hasattr(settings, 'frontend_origin') and settings.frontend_origin:
    allowed_origins.extend([origin.strip() for origin in settings.frontend_origin.split(',') if origin.strip()])

CORS(app, supports_credentials=True, origins=allowed_origins)

@app.after_request
def add_cors_headers(response):
    """Ensure CORS headers are present on ALL responses including errors."""
    origin = request.headers.get("Origin", "")
    if origin and ("localhost" in origin or "127.0.0.1" in origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return response

@app.errorhandler(Exception)
def handle_global_exception(e):
    logger.error(f"Global unhandled exception: {e}", exc_info=True)
    response = jsonify({"detail": "An internal server error occurred. Please try again."})
    response.status_code = 500
    origin = request.headers.get("Origin", "")
    if origin and ("localhost" in origin or "127.0.0.1" in origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return response


# Database repository lifecycle management
@app.before_request
def before_request():
    # Skip repo init for OPTIONS preflight — no DB needed
    if request.method == "OPTIONS":
        return
    g.prediction_repo = PredictionRepository()
    g.expert_repo = ExpertRepository()
    g.active_learning_repo = ActiveLearningRepository()
    g.candidate_repo = CandidateRepository()
    g.training_repo = TrainingRepository()
    g.deployment_repo = DeploymentRepository()

@app.teardown_appcontext
def teardown_db(exception=None):
    pass

@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "PaddyGuard AI API is running", "docs": "/docs"})

@app.route("/api/health", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    try:
        from app.database import get_mongo_client
        client = get_mongo_client()
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster')
        db_status = "connected"
    except Exception as e:
        db_status = "disconnected"

    return jsonify({
        "status": "ok", 
        "database": db_status, 
        "model_loaded": model_service.model is not None
    })

@app.route("/api/analyze", methods=["POST"])
def analyze():
    if 'file' not in request.files:
        return jsonify({"detail": "No file part in the request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"detail": "No selected file"}), 400

    # Parse form parameters
    city = request.form.get("city", "").strip()
    
    try:
        latitude_str = request.form.get("latitude")
        latitude = float(latitude_str) if latitude_str and latitude_str.lower() != 'none' else None
    except ValueError:
        latitude = None

    try:
        longitude_str = request.form.get("longitude")
        longitude = float(longitude_str) if longitude_str and longitude_str.lower() != 'none' else None
    except ValueError:
        longitude = None

    try:
        field_area_acres = float(request.form.get("field_area_acres", 0))
    except ValueError:
        return jsonify({"detail": "Field area must be a valid number"}), 400

    try:
        affected_field_percentage = float(request.form.get("affected_field_percentage", 0))
    except ValueError:
        return jsonify({"detail": "Affected field percentage must be a valid number"}), 400

    rice_variety = request.form.get("rice_variety", "Unknown")
    growth_stage = request.form.get("growth_stage", "Unknown")

    try:
        expected_yield_str = request.form.get("expected_yield_kg_per_acre")
        expected_yield_kg_per_acre = float(expected_yield_str) if expected_yield_str and expected_yield_str.lower() != 'none' else None
    except ValueError:
        expected_yield_kg_per_acre = None

    treatment_applied_str = request.form.get("treatment_applied", "false").lower()
    treatment_applied = treatment_applied_str in ["true", "1", "yes"]

    # Validations
    if field_area_acres <= 0:
        return jsonify({"detail": "Field area must be greater than zero"}), 400
    if not 0 <= affected_field_percentage <= 100:
        return jsonify({"detail": "Affected field percentage must be between 0 and 100"}), 400

    try:
        import hashlib
        from datetime import datetime, timedelta

        # Read image bytes and calculate SHA-256 hash
        image_bytes = file.read()
        image_hash = hashlib.sha256(image_bytes).hexdigest()

        # Optional Token Extraction & Verification
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        user_info = None
        if token:
            user_info, _, _ = verify_token_details(token)

        # Duplicate detection (only for authenticated normal users)
        if user_info and user_info.get("role") == "USER":
            user_id = user_info.get("user_id")
            five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
            duplicate_case = g.prediction_repo.collection.find_one({
                "user_id": str(user_id),
                "image_hash": image_hash,
                "created_at": {"$gte": five_minutes_ago}
            })
            if duplicate_case:
                elapsed = (datetime.utcnow() - duplicate_case["created_at"]).total_seconds()
                retry_after_seconds = max(0, int(300 - elapsed))
                return jsonify({
                    "error": "duplicate_upload",
                    "message": "You already uploaded this same image within the last 5 minutes.",
                    "retry_after_seconds": retry_after_seconds
                }), 429

        case_id = f"PG-{uuid.uuid4().hex[:12].upper()}"
        ext = os.path.splitext(file.filename)[1]
        if not ext:
            ext = ".jpg"
        stored_filename = f"{case_id}{ext}"
        
        # Temporarily save original image for ML and Cloudinary upload
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        temp_original_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)
        with open(temp_original_path, "wb") as f:
            f.write(image_bytes)

        image = Image.open(BytesIO(image_bytes))
        prediction = model_service.predict(image)

        # Clean up local original temp file if image is OOD
        if prediction["status"] == "OOD":
            try:
                os.remove(temp_original_path)
            except Exception:
                pass
            return jsonify({"prediction": prediction, "context_analysis": None})

        # Upload original image to Cloudinary
        original_upload = upload_image_to_cloudinary(temp_original_path, "paddyguard/originals")
        image_url = original_upload["secure_url"]
        image_public_id = original_upload["public_id"]
        
        # Clean up local original copy now that it's in Cloudinary
        try:
            os.remove(temp_original_path)
        except Exception as e:
            logger.error(f"Failed to delete temp original file: {e}")

        # Process Grad-CAM visualization
        gradcam_image_name = None
        gradcam_url = None
        gradcam_public_id = None
        if prediction.get("gradcam_base64"):
            gradcam_image_name = f"{case_id}.png"
            os.makedirs(app.config['GRADCAM_FOLDER'], exist_ok=True)
            temp_gradcam_path = os.path.join(app.config['GRADCAM_FOLDER'], gradcam_image_name)
            gradcam_bytes = base64.b64decode(prediction["gradcam_base64"])
            with open(temp_gradcam_path, "wb") as f:
                f.write(gradcam_bytes)
            
            # Upload Grad-CAM to Cloudinary
            gradcam_upload = upload_image_to_cloudinary(temp_gradcam_path, "paddyguard/gradcam")
            gradcam_url = gradcam_upload["secure_url"]
            gradcam_public_id = gradcam_upload["public_id"]
            
            # Clean up local Grad-CAM copy
            try:
                os.remove(temp_gradcam_path)
            except Exception as e:
                logger.error(f"Failed to delete temp gradcam file: {e}")

        # Location and Weather Analysis
        if latitude is None or longitude is None:
            if not city:
                return jsonify({"detail": "Provide a Sri Lankan city or GPS coordinates"}), 400
            location = geocode_sri_lanka(city)
        else:
            location = {
                "city": city or "GPS location",
                "district": None,
                "latitude": latitude,
                "longitude": longitude,
            }

        weather = get_weather(location["latitude"], location["longitude"])
        
        if prediction["status"] == "KNOWN":
            risk = calculate_risk(
                disease=prediction["prediction"],
                severity_percentage=prediction["severity_percentage"],
                affected_field_percentage=affected_field_percentage,
                growth_stage=growth_stage,
                weather=weather,
                area_acres=field_area_acres,
                expected_yield_kg_per_acre=expected_yield_kg_per_acre,
                treatment_applied=treatment_applied,
            )
            calc_breakdown = risk.pop("calculation_breakdown", {})
            calc_breakdown["disease"] = {
                "predicted_class": prediction["prediction"],
                "confidence": prediction["confidence"],
                "class_probabilities": prediction.get("class_probabilities", {})
            }
            severity_breakdown = prediction.get("severity_breakdown", {})
            calc_breakdown["severity"] = {
                "method": prediction.get("severity_method"),
                "activation_threshold": severity_breakdown.get("activation_threshold"),
                "active_pixel_count": severity_breakdown.get("active_pixel_count"),
                "total_pixel_count": severity_breakdown.get("total_pixel_count"),
                "severity_percentage": prediction["severity_percentage"],
                "severity_level": severity_label(prediction["severity_percentage"]) if prediction["severity_percentage"] is not None else None
            }
        else:
            risk = {}
            calc_breakdown = None

        username_from_request = request.form.get("created_by") or request.headers.get("X-User-Name")
        current_user = getattr(g, "current_user", None) or {}
        created_by = username_from_request or current_user.get("username")
        
        final_user_id = user_info.get("user_id") if user_info else None

        record_data = {
            "case_id": case_id,
            "user_id": final_user_id,
            "image_hash": image_hash,
            "image_name": stored_filename,
            "image_url": image_url,
            "image_public_id": image_public_id,
            "gradcam_image_name": gradcam_image_name,
            "gradcam_url": gradcam_url,
            "gradcam_public_id": gradcam_public_id,
            "predicted_disease": prediction["prediction"],
            "confidence": prediction["confidence"],
            "status": prediction["status"],
            "severity_percentage": prediction.get("severity_percentage"),
            "severity_level": severity_label(prediction["severity_percentage"]) if prediction.get("severity_percentage") is not None else None,
            "city": location["city"],
            "district": location.get("district"),
            "latitude": location["latitude"],
            "longitude": location["longitude"],
            "field_area_acres": field_area_acres,
            "affected_field_percentage": affected_field_percentage,
            "rice_variety": rice_variety,
            "growth_stage": growth_stage,
            "expected_yield_kg_per_acre": expected_yield_kg_per_acre,
            "treatment_applied": treatment_applied,
            "weather_json": json.dumps(weather),
            "predicted_loss_percentage": risk.get("predicted_loss_percentage"),
            "estimated_loss_kg": risk.get("estimated_loss_kg"),
            "created_by": created_by,
            "is_low_confidence": prediction.get("is_low_confidence", False),
            "energy_score": prediction.get("energy_score"),
            "needs_expert_review": prediction.get("needs_expert_review", False),
            "review_status": "pending",
            "review_reason": "LOW_CONFIDENCE" if prediction.get("needs_expert_review", False) else None,
            "consumed_by_job_id": None,
            "approved_for_training": False
        }
        
        g.prediction_repo.create(record_data)

        return jsonify({
            "case_id": case_id,
            "prediction": prediction,
            "severity_level": record_data["severity_level"],
            "location": location,
            "weather": weather,
            "yield_loss": risk if prediction["status"] == "KNOWN" else None,
            "calculation_breakdown": calc_breakdown,
            "advisory": {
                "message": "Use this result as decision support and confirm severe/uncertain cases with an agricultural officer." if prediction["status"] == "KNOWN" else "This prediction is uncertain. An expert review has been requested.",
                "safety": "Do not apply chemical treatment based only on an AI result.",
            },
        })
    except ValueError as exc:
        logger.error(f"Validation/Geocoding error: {exc}")
        return jsonify({"detail": str(exc)}), 400
    except Exception as exc:
        logger.error(f"Unhandled error in analyze: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/cases", methods=["GET"])
def list_cases():
    try:
        username = request.args.get("username")
        current_user = getattr(g, "current_user", None) or {}
        requested_username = username or current_user.get("username")

        top_k_rows = get_top_k_candidates()
        top_k_ids = {r.case_id for r in top_k_rows}

        rows = g.prediction_repo.collection.find({}) if not requested_username else g.prediction_repo.collection.find({"created_by": requested_username})
        rows = rows.sort("created_at", -1)
        results = []
        for r in rows:
            needs_expert = r.get("needs_expert_review")
            rev_reason = r.get("review_reason")
            if r.get("case_id") in top_k_ids:
                needs_expert = True
                rev_reason = "TOP_K_UNCERTAINTY"

            results.append({
                "case_id": r.get("case_id"),
                "created_at": r.get("created_at").isoformat() if isinstance(r.get("created_at"), datetime) else r.get("created_at"),
                "predicted_disease": r.get("predicted_disease"),
                "confidence": r.get("confidence"),
                "severity_percentage": r.get("severity_percentage"),
                "severity_level": r.get("severity_level"),
                "city": r.get("city"),
                "predicted_loss_percentage": r.get("predicted_loss_percentage"),
                "estimated_loss_kg": r.get("estimated_loss_kg"),
                "approved_for_training": r.get("approved_for_training"),
                "needs_expert_review": needs_expert,
                "review_status": r.get("review_status"),
                "review_reason": rev_reason,
                "expert_validated_disease": r.get("expert_validated_disease"),
                "created_by": r.get("created_by"),
                "original_image_url": r.get("image_url") if r.get("image_url") else (f"/api/images/{r.get('image_name')}" if r.get("image_name") else None),
                "gradcam_image_url": r.get("gradcam_url") if r.get("gradcam_url") else (f"/api/gradcam/{r.get('gradcam_image_name')}" if r.get("gradcam_image_name") else None)
            })
        return jsonify(results)
    except Exception as exc:
        logger.error(f"Error listing cases: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/cases/<case_id>", methods=["DELETE"])
def delete_case(case_id):
    try:
        row = g.prediction_repo.find_by_case_id(case_id)
        if not row:
            return jsonify({"detail": "Case not found"}), 404
            
        # Clean up Cloudinary assets associated with this case (if no other case uses them)
        if row.image_public_id:
            other = g.prediction_repo.collection.find_one({"image_public_id": row.image_public_id, "case_id": {"$ne": case_id}})
            if not other:
                delete_cloudinary_asset(row.image_public_id)
        if row.gradcam_public_id:
            other = g.prediction_repo.collection.find_one({"gradcam_public_id": row.gradcam_public_id, "case_id": {"$ne": case_id}})
            if not other:
                delete_cloudinary_asset(row.gradcam_public_id)
                
        g.prediction_repo.delete(case_id)
        return jsonify({"message": "Case deleted successfully"})
    except Exception as exc:
        logger.error(f"Error deleting case: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/cases/<case_id>/feedback", methods=["PATCH"])
def update_feedback(case_id):
    try:
        row = g.prediction_repo.find_by_case_id(case_id)
        if not row:
            return jsonify({"detail": "Case not found"}), 404

        data = request.get_json() or {}
        allowed_fields = [
            "farmer_confirmation",
            "expert_validated_disease",
            "actual_harvest_kg",
            "expected_healthy_harvest_kg",
            "approved_for_training"
        ]
        updates = {}
        for key in allowed_fields:
            if key in data:
                updates[key] = data[key]
                
        g.prediction_repo.update(case_id, updates)
        return jsonify({"message": "Feedback saved", "case_id": case_id})
    except Exception as exc:
        logger.error(f"Error updating feedback: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/cases/<case_id>/refresh-weather", methods=["POST"])
def refresh_weather(case_id):
    try:
        row = g.prediction_repo.find_by_case_id(case_id)
        if not row:
            return jsonify({"detail": "Case not found"}), 404

        if row.latitude is None or row.longitude is None:
             return jsonify({"detail": "Case lacks GPS coordinates for weather refresh"}), 400

        weather = get_weather(row.latitude, row.longitude)
        
        risk = calculate_risk(
            disease=row.predicted_disease,
            severity_percentage=row.severity_percentage,
            affected_field_percentage=row.affected_field_percentage,
            growth_stage=row.growth_stage,
            weather=weather,
            area_acres=row.field_area_acres,
            expected_yield_kg_per_acre=row.expected_yield_kg_per_acre,
            treatment_applied=row.treatment_applied,
        )
        
        updates = {
            "weather_json": json.dumps(weather),
            "predicted_loss_percentage": risk["predicted_loss_percentage"],
            "estimated_loss_kg": risk.get("estimated_loss_kg")
        }
        g.prediction_repo.update(case_id, updates)
        
        calc_breakdown = risk.pop("calculation_breakdown", {})
        
        return jsonify({
            "message": "Weather refreshed",
            "weather": weather,
            "yield_loss": risk,
            "calculation_breakdown": calc_breakdown
        })
    except Exception as exc:
        logger.error(f"Error refreshing weather: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/review-queue", methods=["GET"])
@token_required(required_role="EXPERT")
def list_review_queue():
    try:
        low_conf_rows = g.prediction_repo.find_pending_reviews()
        top_k_rows = get_top_k_candidates()
        
        results = []
        for r in low_conf_rows:
            results.append({
                "case_id": r.case_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "image_name": r.image_name,
                "predicted_disease": r.predicted_disease,
                "confidence": r.confidence,
                "energy_score": r.energy_score,
                "status": r.status,
                "review_status": r.review_status,
                "review_reason": r.review_reason,
                "city": r.city if r.city else None,
                "original_image_url": r.image_url if r.image_url else (f"/api/images/{r.image_name}" if r.image_name else None),
                "gradcam_image_url": r.gradcam_url if r.gradcam_url else (f"/api/gradcam/{r.gradcam_image_name}" if r.gradcam_image_name else None)
            })
            
        for r in top_k_rows:
            results.append({
                "case_id": r.case_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "image_name": r.image_name,
                "predicted_disease": r.predicted_disease,
                "confidence": r.confidence,
                "energy_score": r.energy_score,
                "status": r.status,
                "review_status": r.review_status,
                "review_reason": "TOP_K_UNCERTAINTY",
                "city": r.city if r.city else None,
                "original_image_url": r.image_url if r.image_url else (f"/api/images/{r.image_name}" if r.image_name else None),
                "gradcam_image_url": r.gradcam_url if r.gradcam_url else (f"/api/gradcam/{r.gradcam_image_name}" if r.gradcam_image_name else None)
            })
            
        return jsonify(results)
    except Exception as exc:
        logger.error(f"Error listing review queue: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/review-queue/<case_id>", methods=["GET"])
@token_required(required_role="EXPERT")
def get_review_case(case_id):
    try:
        row = g.prediction_repo.find_by_case_id(case_id)
        if not row:
            return jsonify({"detail": "Case not found"}), 404
        return jsonify({
            "case_id": row.case_id,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "image_name": row.image_name,
            "predicted_disease": row.predicted_disease,
            "confidence": row.confidence,
            "energy_score": row.energy_score,
            "status": row.status,
            "review_status": row.review_status,
            "review_reason": row.review_reason,
            "expert_validated_disease": row.expert_validated_disease,
            "original_image_url": row.image_url if row.image_url else (f"/api/images/{row.image_name}" if row.image_name else None),
            "gradcam_image_url": row.gradcam_url if row.gradcam_url else (f"/api/gradcam/{row.gradcam_image_name}" if row.gradcam_image_name else None)
        })
    except Exception as exc:
        logger.error(f"Error fetching review case: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/review-queue/<case_id>/verify", methods=["PATCH", "POST"])
@token_required(required_role="EXPERT")
def verify_review_case(case_id):
    try:
        row = g.prediction_repo.find_by_case_id(case_id)
        if not row:
            return jsonify({"detail": "Case not found"}), 404

        data = request.get_json() or {}
        expert_label = data.get("expert_label")
        if expert_label not in ["Bacterial_Blight", "Brown_Spot", "Healthy", "Leaf_Blast"]:
            return jsonify({"detail": "Invalid expert label"}), 400

        needs_expert = row.needs_expert_review or False
        review_reason = row.review_reason

        if row.review_status == "pending" and not row.needs_expert_review:
            top_k = get_top_k_candidates()
            if any(c.case_id == row.case_id for c in top_k):
                needs_expert = True
                review_reason = "TOP_K_UNCERTAINTY"

        verified_at = datetime.utcnow()
        updates = {
            "needs_expert_review": needs_expert,
            "review_reason": review_reason,
            "review_status": "verified",
            "expert_validated_disease": expert_label,
            "verified_at": verified_at,
            "expert_reviewed_at": verified_at,
            "approved_for_training": True,
            "consumed_by_job_id": None
        }
        g.prediction_repo.update(case_id, updates)
        return jsonify({"message": "Case verified", "case_id": case_id})
    except Exception as exc:
        logger.error(f"Error verifying review case: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/dashboard-stats", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def dashboard_stats():
    try:
        pending_count = g.prediction_repo.count_pending_expert_reviews()
        verified_count = g.prediction_repo.count_verified_expert_samples()
        approved_count = g.prediction_repo.count_approved_for_training_samples()
        active_learning_eligible_count = g.prediction_repo.count_active_learning_eligible()
        consumed_count = g.prediction_repo.count_consumed_training_samples()

        backend_dir = os.path.dirname(os.path.dirname(__file__))
        backups_dir = os.path.join(backend_dir, "models", "backups")
        try:
            backups_files = [f for f in os.listdir(backups_dir) if os.path.isfile(os.path.join(backups_dir, f))]
        except Exception:
            backups_files = []

        rejected_kept = g.candidate_repo.count_rejected_kept()
        active_models_count = g.deployment_repo.count_active()

        return jsonify({
            "pending_expert_reviews": pending_count,
            "verified_expert_samples": verified_count,
            "approved_for_training_samples": approved_count,
            "active_learning_eligible_samples": active_learning_eligible_count,
            "consumed_training_samples": consumed_count,
            "next_batch_size": 100,
            "storage_summary": {
                "active_models": active_models_count,
                "backups_kept": len(backups_files),
                "max_backups": settings.max_backups,
                "rejected_candidates_kept": rejected_kept,
                "max_rejected_candidates": settings.max_rejected_candidates
            }
        })
    except Exception as exc:
        logger.error(f"Error fetching dashboard stats: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/images/<filename>", methods=["GET"])
def get_image(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/api/gradcam/<filename>", methods=["GET"])
def get_gradcam_image(filename):
    return send_from_directory(app.config["GRADCAM_FOLDER"], filename)

@app.route("/api/expert/active-learning/prepare-batch", methods=["POST"])
@token_required(required_role="SUPER_ADMIN")
def prepare_batch():
    try:
        exclude_case_ids = g.active_learning_repo.get_all_batch_sample_case_ids()
        eligible_cases = g.prediction_repo.find_verified_unused_samples(exclude_case_ids)
        
        sample_count = len(eligible_cases)
        if sample_count == 0:
            return jsonify({"detail": "No eligible samples available for a new batch."}), 400
            
        batch_id = f"AL-BATCH-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        is_demo_mode = sample_count < 100
        
        new_batch = {
            "batch_id": batch_id,
            "sample_count": sample_count,
            "status": "READY",
            "is_demo_mode": is_demo_mode,
            "recommended_batch_size": 100
        }
        g.active_learning_repo.create_batch(new_batch)
        
        for case in eligible_cases:
            g.active_learning_repo.add_batch_sample(batch_id, case.case_id)
            
        return jsonify({
            "batch_id": batch_id,
            "sample_count": sample_count,
            "recommended_batch_size": 100,
            "is_demo_mode": is_demo_mode,
            "status": "READY"
        })
    except Exception as exc:
        logger.error(f"Error preparing batch: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/active-learning/batches", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def list_batches():
    try:
        batches = g.active_learning_repo.list_all_batches()
        result = []
        for b in batches:
            result.append({
                "batch_id": b.batch_id,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "sample_count": b.sample_count,
                "status": b.status,
                "is_demo_mode": b.is_demo_mode,
                "recommended_batch_size": b.recommended_batch_size
            })
        return jsonify(result)
    except Exception as exc:
        logger.error(f"Error listing batches: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/active-learning/batches/<batch_id>", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def get_batch(batch_id):
    try:
        batch = g.active_learning_repo.find_batch_by_id(batch_id)
        if not batch:
            return jsonify({"detail": "Batch not found"}), 404
            
        samples = g.active_learning_repo.find_samples_by_batch_id(batch_id)
        
        samples_list = []
        for s in samples:
            samples_list.append({
                "case_id": s.case_id,
                "predicted_disease": s.predicted_disease,
                "confidence": s.confidence,
                "expert_validated_disease": s.expert_validated_disease,
                "review_reason": s.review_reason
            })
            
        return jsonify({
            "batch": {
                "batch_id": batch.batch_id,
                "created_at": batch.created_at.isoformat() if batch.created_at else None,
                "sample_count": batch.sample_count,
                "status": batch.status,
                "is_demo_mode": batch.is_demo_mode,
                "recommended_batch_size": batch.recommended_batch_size
            },
            "samples": samples_list
        })
    except Exception as exc:
        logger.error(f"Error getting batch {batch_id}: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/active-learning/batches/<batch_id>/start", methods=["POST"])
@token_required(required_role="SUPER_ADMIN")
def start_batch_retraining(batch_id):
    try:
        batch = g.active_learning_repo.find_batch_by_id(batch_id)
        if not batch:
            return jsonify({"detail": "Batch not found"}), 404
            
        if batch.status != "READY":
            return jsonify({"detail": "Batch is already started or completed"}), 400
            
        status = "TRAINING_SIMULATION" if batch.is_demo_mode else "TRAINING"
        g.active_learning_repo.update_batch(batch_id, {"status": status})
        
        return jsonify({"message": "Retraining started", "status": status})
    except Exception as exc:
        logger.error(f"Error starting batch {batch_id}: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/active-learning/batches/<batch_id>/export", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def export_batch(batch_id):
    try:
        batch = g.active_learning_repo.find_batch_by_id(batch_id)
        if not batch:
            return jsonify({"detail": "Batch not found"}), 404
            
        samples = g.active_learning_repo.find_samples_by_batch_id(batch_id)
        
        # 1. Create Manifest and collect trainable info
        manifest_data = []
        trainable_sample_count = 0
        temp_downloaded_paths = []
        
        for s in samples:
            # Check validation rules
            if s.review_status != "verified" or not s.approved_for_training or not s.expert_validated_disease:
                continue
                
            if s.expert_validated_disease not in ["Bacterial_Blight", "Brown_Spot", "Healthy", "Leaf_Blast"]:
                continue
                
            original_image_path = os.path.join(app.config["UPLOAD_FOLDER"], s.image_name) if s.image_name else None
            image_exists = original_image_path and os.path.exists(original_image_path)
            
            # If the image is not local, temporarily download it from Cloudinary
            if not image_exists and s.image_url:
                try:
                    logger.info(f"Downloading original image for zip export from Cloudinary: {s.image_url}")
                    r_img = requests.get(s.image_url, timeout=10)
                    if r_img.status_code == 200:
                        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
                        with open(original_image_path, "wb") as f_img:
                            f_img.write(r_img.content)
                        image_exists = True
                        temp_downloaded_paths.append(original_image_path)
                except Exception as e:
                    logger.error(f"Failed to download image from Cloudinary for zip: {e}")
            
            manifest_data.append({
                "case_id": s.case_id,
                "image_filename": s.image_name if s.image_name else "",
                "image_available": str(image_exists).lower(),
                "ai_prediction": s.predicted_disease,
                "ai_confidence": s.confidence,
                "expert_label": s.expert_validated_disease,
                "review_reason": s.review_reason,
                "review_status": s.review_status,
                "verified_at": s.verified_at.isoformat() if s.verified_at else ""
            })
            if image_exists:
                trainable_sample_count += 1
                
        # 2. Update tracking
        g.active_learning_repo.update_batch(batch_id, {
            "exported_at": datetime.utcnow(),
            "export_count": batch.export_count + 1
        })

        # 3. Create Metadata
        metadata = {
            "project": "PaddyGuard AI",
            "batch_id": batch.batch_id,
            "source": getattr(batch, "source", "EXPERT_VERIFIED_ACTIVE_LEARNING"),
            "created_at": batch.created_at.isoformat() if batch.created_at else "",
            "exported_at": datetime.utcnow().isoformat(),
            "sample_count": batch.sample_count,
            "trainable_sample_count": trainable_sample_count,
            "recommended_batch_size": batch.recommended_batch_size,
            "is_demo_mode": batch.is_demo_mode,
            "deployed_model": "PaddyGuard_active_learning_round2.pth",
            "deployed_model_test_accuracy": 0.9714,
            "deployed_model_macro_f1": 0.9714,
            "architecture": "EfficientNetB3",
            "classes": [
                "Bacterial_Blight",
                "Brown_Spot",
                "Healthy",
                "Leaf_Blast"
            ],
            "purpose": "Controlled offline Active Learning retraining"
        }

        # 4. Generate ZIP in memory
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f"PaddyGuard_AL_BATCH_{batch_id}/batch_metadata.json", json.dumps(metadata, indent=2))
            
            if manifest_data:
                manifest_io = io.StringIO()
                fieldnames = ["case_id", "image_filename", "image_available", "ai_prediction", "ai_confidence", "expert_label", "review_reason", "review_status", "verified_at"]
                writer = csv.DictWriter(manifest_io, fieldnames=fieldnames)
                writer.writeheader()
                for row in manifest_data:
                    writer.writerow(row)
                zf.writestr(f"PaddyGuard_AL_BATCH_{batch_id}/manifest.csv", manifest_io.getvalue())
                
            for s in manifest_data:
                if s["image_available"] == "true":
                    img_path = os.path.join(app.config["UPLOAD_FOLDER"], s["image_filename"])
                    if os.path.exists(img_path):
                        zf.write(img_path, arcname=f"PaddyGuard_AL_BATCH_{batch_id}/images/{s['case_id']}{os.path.splitext(s['image_filename'])[1]}")
                        
        memory_file.seek(0)
        
        # Clean up temporarily downloaded images
        for path in temp_downloaded_paths:
            try:
                os.remove(path)
            except Exception:
                pass
        
        return send_file(
            memory_file,
            mimetype="application/zip",
            as_attachment=True,
            download_name=f"PaddyGuard_AL_BATCH_{batch_id}.zip"
        )
    except Exception as exc:
        logger.error(f"Error exporting batch {batch_id}: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/model-candidates/upload", methods=["POST"])
@token_required(required_role="SUPER_ADMIN")
def upload_model_candidate():
    try:
        # 1. Check file
        if "file" not in request.files:
            return jsonify({"detail": "No file uploaded"}), 400
            
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"detail": "No selected file"}), 400
            
        if not (file.filename.lower().endswith(".pth")):
            return jsonify({"detail": "Only .pth files are accepted"}), 400
            
        # 2. Get and validate fields
        test_accuracy_raw = request.form.get("test_accuracy")
        macro_f1_raw = request.form.get("macro_f1")
        source_batch_id = request.form.get("source_batch_id") or None
        notes = request.form.get("notes") or None
        
        if not test_accuracy_raw or not macro_f1_raw:
            return jsonify({"detail": "Accuracy and Macro F1 are required"}), 400
            
        try:
            test_accuracy = float(test_accuracy_raw)
            macro_f1 = float(macro_f1_raw)
        except ValueError:
            return jsonify({"detail": "Accuracy and Macro F1 must be valid numbers"}), 400
            
        # Normalization rule
        if test_accuracy > 1.0:
            normalized_accuracy = test_accuracy / 100.0
        else:
            normalized_accuracy = test_accuracy
            
        # Create destination directory
        candidates_dir = os.path.join("models", "candidates")
        os.makedirs(candidates_dir, exist_ok=True)
        
        # Save temp file for validation
        candidate_uid = uuid.uuid4().hex[:8]
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"candidate_{timestamp}_{candidate_uid}.pth"
        stored_path = os.path.join(candidates_dir, safe_filename)
        
        file.save(stored_path)
        
        # 3. Model validation
        try:
            temp_model = tv_models.efficientnet_b3(weights=None)
            in_features = temp_model.classifier[1].in_features
            temp_model.classifier = nn.Sequential(
                nn.Dropout(p=0.4),
                nn.Linear(in_features, 4)
            )
            
            checkpoint = torch.load(stored_path, map_location="cpu", weights_only=False)
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
            elif isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
            else:
                state_dict = checkpoint
                
            temp_model.load_state_dict(state_dict, strict=True)
            
        except Exception as e:
            if os.path.exists(stored_path):
                os.remove(stored_path)
            return jsonify({"detail": f"Model architecture validation failed: {str(e)}"}), 400
            
        # 4. Compare model metrics
        baseline_accuracy = 0.9714
        baseline_macro_f1 = 0.9714
        
        if normalized_accuracy > baseline_accuracy and macro_f1 >= baseline_macro_f1:
            status = "ELIGIBLE_FOR_REVIEW"
        else:
            status = "REJECTED_BY_METRICS"
            
        # 5. Save candidate in database
        candidate_model_record = {
            "candidate_id": f"CAND-{timestamp}-{candidate_uid.upper()}",
            "filename": safe_filename,
            "stored_path": stored_path,
            "test_accuracy": normalized_accuracy,
            "macro_f1": macro_f1,
            "source_batch_id": source_batch_id,
            "notes": notes,
            "status": status,
            "checkpoint_pruned_at": None
        }
        g.candidate_repo.create(candidate_model_record)
        
        try:
            model_retention.cleanup_rejected_candidates()
        except Exception as e:
            logger.error(f"Failed to cleanup rejected candidates after upload: {e}", exc_info=True)
        
        accuracy_delta_pp = (normalized_accuracy - baseline_accuracy) * 100.0
        f1_delta = macro_f1 - baseline_macro_f1
        
        return jsonify({
            "candidate_id": candidate_model_record["candidate_id"],
            "filename": candidate_model_record["filename"],
            "test_accuracy": candidate_model_record["test_accuracy"],
            "macro_f1": candidate_model_record["macro_f1"],
            "status": candidate_model_record["status"],
            "accuracy_delta_pp": round(accuracy_delta_pp, 4),
            "f1_delta": round(f1_delta, 4),
            "decision": "Candidate Outperformed Current Model" if status == "ELIGIBLE_FOR_REVIEW" else "Candidate Rejected"
        })
        
    except Exception as exc:
        logger.error(f"Error uploading model candidate: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/model-candidates", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def list_model_candidates():
    try:
        candidates = g.candidate_repo.list_all()
        result = []
        for c in candidates:
            result.append({
                "candidate_id": c.candidate_id,
                "filename": c.filename,
                "uploaded_at": c.uploaded_at.isoformat() if c.uploaded_at else None,
                "test_accuracy": c.test_accuracy,
                "macro_f1": c.macro_f1,
                "source_batch_id": c.source_batch_id,
                "notes": c.notes,
                "status": c.status,
                "checkpoint_pruned_at": c.checkpoint_pruned_at.isoformat() if getattr(c, 'checkpoint_pruned_at', None) else None
            })
        return jsonify(result)
    except Exception as exc:
        logger.error(f"Error listing model candidates: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    try:
        data = request.json or {}
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"detail": "Username/Email and password are required"}), 400
            
        # 1. Super admin check
        if username == settings.super_admin_username:
            if password == settings.super_admin_password:
                token = serializer.dumps({"username": username, "role": "SUPER_ADMIN", "user_id": "SUPER_ADMIN"}, salt="auth-token")
                return jsonify({
                    "token": token,
                    "username": username,
                    "role": "SUPER_ADMIN",
                    "user": {
                        "user_id": "SUPER_ADMIN",
                        "name": "Super Admin",
                        "email": "admin@paddyguard.com",
                        "role": "SUPER_ADMIN"
                    }
                })
            else:
                return jsonify({"detail": "Invalid credentials"}), 401
                
        # 2. Expert check
        user = g.expert_repo.find_by_username(username)
        if user:
            if not user.is_active:
                return jsonify({"detail": "This expert account has been disabled"}), 403
            if check_password_hash(user.password_hash, password):
                token = serializer.dumps({"username": username, "role": "EXPERT", "user_id": str(user.id)}, salt="auth-token")
                return jsonify({
                    "token": token,
                    "username": username,
                    "role": "EXPERT",
                    "user": {
                        "user_id": str(user.id),
                        "name": user.name,
                        "email": user.username,
                        "role": "EXPERT"
                    }
                })
            return jsonify({"detail": "Invalid credentials"}), 401
            
        # 3. Normal user check (by email)
        normal_user = UserRepository().find_by_email(username)
        if normal_user:
            if not normal_user.is_active:
                return jsonify({"detail": "This account has been disabled"}), 403
            if check_password_hash(normal_user.password_hash, password):
                token = serializer.dumps({
                    "username": normal_user.email,
                    "role": "USER",
                    "user_id": normal_user.user_id
                }, salt="auth-token")
                return jsonify({
                    "token": token,
                    "username": normal_user.name,
                    "role": "USER",
                    "user": {
                        "user_id": normal_user.user_id,
                        "name": normal_user.name,
                        "email": normal_user.email,
                        "role": "USER"
                    }
                })
            return jsonify({"detail": "Invalid credentials"}), 401
            
        return jsonify({"detail": "Invalid credentials"}), 401
    except Exception as exc:
        logger.error(f"Error logging in: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    try:
        logger.info("REGISTER_ROUTE_REACHED")
        data = request.json or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        password = data.get("password")
        
        # Validations
        if not name:
            return jsonify({"detail": "Name is required"}), 400
        if not email or "@" not in email:
            return jsonify({"detail": "Valid email is required"}), 400
        if not password or len(password) < 6:
            return jsonify({"detail": "Password must be at least 6 characters long"}), 400
            
        user_repo = UserRepository()
        if user_repo.find_by_email(email):
            return jsonify({"detail": "Email already registered"}), 400
            
        password_hash = generate_password_hash(password)
        new_user = {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "role": "USER",
            "is_active": True
        }
        
        user_record = user_repo.create(new_user)
        return jsonify({
            "message": "User registered successfully",
            "user": {
                "user_id": user_record.user_id,
                "name": user_record.name,
                "email": user_record.email,
                "role": user_record.role
            }
        }), 201
    except ValueError as val_err:
        logger.warning(f"Registration validation error: {val_err}")
        return jsonify({"detail": str(val_err)}), 400
    except Exception as exc:
        logger.error(f"Error registering user: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/user/me", methods=["GET"])
@token_required()
def user_me():
    try:
        user_id = g.current_user.get("user_id")
        role = g.current_user.get("role")
        
        if role == "USER":
            user = UserRepository().find_by_id(user_id)
            if not user:
                return jsonify({"detail": "User not found"}), 404
            return jsonify({
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active
            })
        elif role == "EXPERT":
            user = g.expert_repo.find_by_id(user_id)
            if not user:
                return jsonify({"detail": "Expert not found"}), 404
            return jsonify({
                "user_id": str(user.id),
                "name": user.name,
                "email": user.username,
                "role": user.role,
                "is_active": user.is_active
            })
        elif role == "SUPER_ADMIN":
            return jsonify({
                "user_id": "SUPER_ADMIN",
                "name": "Super Admin",
                "email": "admin@paddyguard.com",
                "role": "SUPER_ADMIN",
                "is_active": True
            })
        else:
            return jsonify({"detail": "Invalid role"}), 400
    except Exception as exc:
        logger.error(f"Error in /api/user/me: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/user/history", methods=["GET"])
@token_required(required_role="USER")
def user_history():
    try:
        user_id = g.current_user["user_id"]
        cursor = g.prediction_repo.collection.find({"user_id": str(user_id)}).sort("created_at", -1)
        results = []
        for r in cursor:
            results.append({
                "case_id": r.get("case_id"),
                "created_at": r.get("created_at").isoformat() if isinstance(r.get("created_at"), datetime) else r.get("created_at"),
                "predicted_disease": r.get("predicted_disease"),
                "confidence": r.get("confidence"),
                "severity_percentage": r.get("severity_percentage"),
                "severity_level": r.get("severity_level"),
                "status": r.get("status"),
                "city": r.get("city"),
                "district": r.get("district"),
                "field_area_acres": r.get("field_area_acres"),
                "affected_field_percentage": r.get("affected_field_percentage"),
                "rice_variety": r.get("rice_variety"),
                "growth_stage": r.get("growth_stage"),
                "expected_yield_kg_per_acre": r.get("expected_yield_kg_per_acre"),
                "treatment_applied": r.get("treatment_applied"),
                "original_image_url": r.get("image_url") if r.get("image_url") else (f"/api/images/{r.get('image_name')}" if r.get("image_name") else None),
                "gradcam_image_url": r.get("gradcam_url") if r.get("gradcam_url") else (f"/api/gradcam/{r.get('gradcam_image_name')}" if r.get("gradcam_image_name") else None)
            })
        return jsonify(results)
    except Exception as exc:
        logger.error(f"Error in user_history: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/admin/users", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def list_admin_users():
    try:
        user_repo = UserRepository()
        users = user_repo.list_all()
        
        # Aggregate prediction case counts by user_id to avoid N+1 queries
        pipeline = [
            {"$match": {"user_id": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
        ]
        counts_cursor = g.prediction_repo.collection.aggregate(pipeline)
        user_counts = {str(item["_id"]): item["count"] for item in counts_cursor}
        
        result = []
        for u in users:
            analysis_count = user_counts.get(str(u.user_id), 0)
            result.append({
                "user_id": u.user_id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "updated_at": u.updated_at.isoformat() if u.updated_at else None,
                "analysis_count": analysis_count
            })
        return jsonify(result)
    except Exception as exc:
        logger.error(f"Error listing admin users: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/admin/users/<user_id>", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def get_admin_user(user_id):
    try:
        user = UserRepository().find_by_id(user_id)
        if not user:
            return jsonify({"detail": "User not found"}), 404
            
        analysis_count = g.prediction_repo.collection.count_documents({"user_id": str(user.user_id)})
        
        return jsonify({
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "analysis_count": analysis_count
        })
    except Exception as exc:
        logger.error(f"Error fetching admin user: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/admin/users/<user_id>", methods=["PUT"])
@token_required(required_role="SUPER_ADMIN")
def update_admin_user(user_id):
    try:
        user_repo = UserRepository()
        user = user_repo.find_by_id(user_id)
        if not user:
            return jsonify({"detail": "User not found"}), 404
            
        data = request.json or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        is_active = data.get("is_active")
        
        if not name:
            return jsonify({"detail": "Name is required"}), 400
        if not email or "@" not in email:
            return jsonify({"detail": "Valid email is required"}), 400
            
        # Check duplicate email
        existing = user_repo.find_by_email(email)
        if existing and existing.user_id != user.user_id:
            return jsonify({"detail": "Email already exists"}), 400
            
        updates = {
            "name": name,
            "email": email
        }
        if is_active is not None:
            updates["is_active"] = bool(is_active)
            
        updated_user = user_repo.update(user_id, updates)
        return jsonify({
            "message": "User updated successfully",
            "user": {
                "user_id": updated_user.user_id,
                "name": updated_user.name,
                "email": updated_user.email,
                "role": updated_user.role,
                "is_active": updated_user.is_active
            }
        })
    except Exception as exc:
        logger.error(f"Error updating admin user: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/admin/users/<user_id>", methods=["DELETE"])
@token_required(required_role="SUPER_ADMIN")
def delete_admin_user(user_id):
    try:
        user_repo = UserRepository()
        user = user_repo.find_by_id(user_id)
        if not user:
            return jsonify({"detail": "User not found"}), 404
            
        # Soft delete: deactive the user
        user_repo.update(user_id, {"is_active": False})
        return jsonify({"message": "User deactivated successfully"})
    except Exception as exc:
        logger.error(f"Error deleting admin user: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert-management", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def list_experts():
    try:
        users = g.expert_repo.list_all()
        result = []
        for u in users:
            result.append({
                "id": u.id,
                "name": u.name,
                "username": u.username,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "created_by": u.created_by
            })
        return jsonify(result)
    except Exception as exc:
        logger.error(f"Error listing experts: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert-management", methods=["POST"])
@token_required(required_role="SUPER_ADMIN")
def create_expert():
    try:
        data = request.json or {}
        name = data.get("name")
        username = data.get("username")
        password = data.get("password")
        
        if not name or not username or not password:
            return jsonify({"detail": "Name, username, and password are required"}), 400
            
        if username == settings.super_admin_username or g.expert_repo.find_by_username(username):
            return jsonify({"detail": "Username already exists"}), 400
            
        password_hash = generate_password_hash(password)
        new_user = {
            "name": name,
            "username": username,
            "password_hash": password_hash,
            "role": "EXPERT",
            "is_active": True,
            "created_by": g.current_user["username"]
        }
        user_record = g.expert_repo.create(new_user)
        
        return jsonify({
            "message": "Expert created successfully",
            "expert": {
                "id": user_record.id,
                "name": user_record.name,
                "username": user_record.username,
                "role": user_record.role,
                "is_active": user_record.is_active
            }
        }), 201
    except Exception as exc:
        logger.error(f"Error creating expert: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert-management/<int:expert_id>/toggle-status", methods=["POST"])
@token_required(required_role="SUPER_ADMIN")
def toggle_expert_status(expert_id):
    try:
        user = g.expert_repo.find_by_id(expert_id)
        if not user:
            return jsonify({"detail": "Expert not found"}), 404
            
        g.expert_repo.update(expert_id, {"is_active": not user.is_active})
        user = g.expert_repo.find_by_id(expert_id)
        
        status_str = "enabled" if user.is_active else "disabled"
        return jsonify({
            "message": f"Expert account {status_str} successfully",
            "expert": {
                "id": user.id,
                "username": user.username,
                "is_active": user.is_active
            }
        })
    except Exception as exc:
        logger.error(f"Error toggling expert status: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

# --- IN-APP FINE TUNING ENDPOINTS ---

@app.route("/api/expert/fine-tune/readiness", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def check_fine_tune_readiness():
    try:
        eligible_samples = g.prediction_repo.count_eligible_fine_tune_samples()
        min_required = settings.min_fine_tune_samples
        sufficient_samples = eligible_samples >= min_required
        
        # Test dataset check
        test_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), settings.test_dataset_path)
        test_dataset_ready = False
        class_counts = {}
        
        if os.path.exists(test_dir) and os.path.isdir(test_dir):
            classes = ["Bacterial_Blight", "Brown_Spot", "Healthy", "Leaf_Blast"]
            has_all_classes = True
            for c in classes:
                c_dir = os.path.join(test_dir, c)
                if os.path.exists(c_dir) and os.path.isdir(c_dir):
                    count = len([f for f in os.listdir(c_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                    class_counts[c] = count
                    if count == 0:
                        has_all_classes = False
                else:
                    has_all_classes = False
            
            if has_all_classes:
                test_dataset_ready = True
                
        blockers = []
        if not sufficient_samples:
            blockers.append(f"Insufficient samples ({eligible_samples}/{min_required})")
        if not test_dataset_ready:
            blockers.append("Test dataset missing or incomplete")
            
        return jsonify({
            "eligible_new_samples": eligible_samples,
            "min_required": min_required,
            "sufficient_samples": sufficient_samples,
            "test_dataset_ready": test_dataset_ready,
            "test_dataset_path": test_dir,
            "test_dataset_class_counts": class_counts,
            "can_train": sufficient_samples and test_dataset_ready,
            "blockers": blockers
        })
    except Exception as exc:
        logger.error(f"Error checking readiness: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/fine-tune/start", methods=["POST"])
@token_required(required_role="SUPER_ADMIN")
def start_fine_tuning():
    try:
        # 1. Re-check readiness
        eligible_samples = g.prediction_repo.find_eligible_fine_tune_samples()
        if len(eligible_samples) < settings.min_fine_tune_samples:
            return jsonify({"detail": f"Insufficient samples ({len(eligible_samples)}/{settings.min_fine_tune_samples})"}), 400
            
        test_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), settings.test_dataset_path)
        if not os.path.exists(test_dir):
            return jsonify({"detail": "Test dataset not available"}), 400
            
        # 2. Get active model
        active_record = g.deployment_repo.find_active()
        base_checkpoint = active_record.checkpoint_path if active_record else settings.model_path
        
        if not os.path.isabs(base_checkpoint):
            base_checkpoint = os.path.join(os.path.dirname(os.path.dirname(__file__)), base_checkpoint)
            
        if not os.path.exists(base_checkpoint):
            return jsonify({"detail": f"Base model checkpoint not found at {base_checkpoint}"}), 400
            
        # 3. Create job
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        job_id = f"FT-{timestamp}-{uuid.uuid4().hex[:6].upper()}"
        
        job_data = {
            "job_id": job_id,
            "status": "QUEUED",
            "source_sample_count": len(eligible_samples),
            "base_checkpoint": base_checkpoint,
            "total_epochs": settings.fine_tune_epochs
        }
        g.training_repo.create(job_data)
        
        # Consume samples
        for s in eligible_samples:
            g.prediction_repo.update(s.case_id, {"consumed_by_job_id": job_id})
            
        # 4. Launch subprocess
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        trainer_script = os.path.join(backend_dir, "training", "active_learning_trainer.py")
        mongodb_uri_arg = settings.mongodb_uri or "mongodb://localhost:27017"
        
        cmd = [
            sys.executable,
            trainer_script,
            "--job-id", job_id,
            "--mongodb-uri", mongodb_uri_arg,
            "--test-dir", test_dir,
            "--base-model", base_checkpoint,
            "--epochs", str(settings.fine_tune_epochs)
        ]
        
        log_file = os.path.join(backend_dir, "data", "training_logs", f"{job_id}.log")
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        with open(log_file, 'w') as f:
            subprocess.Popen(cmd, stdout=f, stderr=subprocess.STDOUT, cwd=backend_dir)
            
        return jsonify({"job_id": job_id, "message": "Training job launched"}), 201
        
    except Exception as exc:
        logger.error(f"Error starting training: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/fine-tune/status/<job_id>", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def get_job_status(job_id):
    try:
        job = g.training_repo.find_by_job_id(job_id)
        if not job:
            return jsonify({"detail": "Job not found"}), 404
            
        return jsonify({
            "job_id": job.job_id,
            "status": job.status,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
            "epochs_completed": job.epochs_completed,
            "total_epochs": job.total_epochs,
            "log_tail": job.log_tail,
            "decision": job.decision,
            "candidate_accuracy": job.candidate_accuracy,
            "candidate_macro_f1": job.candidate_macro_f1,
            "accuracy_delta": job.accuracy_delta,
            "f1_delta": job.f1_delta,
            "error_message": job.error_message
        })
    except Exception as exc:
        logger.error(f"Error getting job status: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/fine-tune/jobs", methods=["GET"])
@token_required(required_role="SUPER_ADMIN")
def list_jobs():
    try:
        jobs = g.training_repo.list_all()
        result = []
        for j in jobs:
            result.append({
                "job_id": j.job_id,
                "status": j.status,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "source_sample_count": j.source_sample_count,
                "decision": j.decision,
                "candidate_accuracy": j.candidate_accuracy,
                "candidate_macro_f1": j.candidate_macro_f1,
                "accuracy_delta": j.accuracy_delta,
                "f1_delta": j.f1_delta
            })
        return jsonify(result)
    except Exception as exc:
        logger.error(f"Error listing jobs: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/deployed-model", methods=["GET"])
def get_deployed_model():
    try:
        record = g.deployment_repo.find_active()
        if record:
            return jsonify({
                "checkpoint": os.path.basename(record.checkpoint_path),
                "test_accuracy": record.test_accuracy,
                "macro_f1": record.macro_f1,
                "deployed_at": record.deployed_at.isoformat() if record.deployed_at else None,
                "notes": record.notes
            })
        else:
            return jsonify({
                "checkpoint": "PaddyGuard_active_learning_round2.pth",
                "test_accuracy": 0.9714,
                "macro_f1": 0.9714,
                "deployed_at": None,
                "notes": "Static baseline"
            })
    except Exception as exc:
        logger.error(f"Error getting deployed model: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

@app.route("/api/expert/fine-tune/<job_id>/promote", methods=["POST"])
@token_required(required_role="SUPER_ADMIN")
def promote_candidate(job_id):
    try:
        job = g.training_repo.find_by_job_id(job_id)
        if not job:
            return jsonify({"detail": "Job not found"}), 404
            
        if job.status != "COMPLETED" or job.decision != "ELIGIBLE_FOR_PROMOTION":
            return jsonify({"detail": "Job is not eligible for promotion"}), 400
            
        # 1. Update backend paths
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        models_dir = os.path.join(backend_dir, "models")
        active_model_path = os.path.join(models_dir, "active_model.pth")
        
        # 2. Backup current active model on disk
        current_record = g.deployment_repo.find_active()
        if current_record and os.path.exists(current_record.checkpoint_path):
            backup_dir = os.path.join(models_dir, "backups")
            os.makedirs(backup_dir, exist_ok=True)
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}_{os.path.basename(current_record.checkpoint_path)}"
            shutil.copy2(current_record.checkpoint_path, os.path.join(backup_dir, backup_name))
            
        # 3. Copy candidate checkpoint to active_model.pth
        shutil.copy2(job.candidate_checkpoint, active_model_path)
        
        # 4. Update .env MODEL_PATH (if .env is writable)
        try:
            env_path = os.path.join(backend_dir, ".env")
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    lines = f.readlines()
                with open(env_path, 'w') as f:
                    for line in lines:
                        if line.startswith("MODEL_PATH="):
                            f.write("MODEL_PATH=models/active_model.pth\n")
                        else:
                            f.write(line)
        except Exception as e:
            logger.warning(f"Could not update .env MODEL_PATH: {e}")
            
        settings.model_path = "models/active_model.pth"
        
        # 5. Hot reload the model service
        try:
            model_service.reload()
            # Try a sanity prediction (blank image)
            img = Image.new('RGB', (300, 300), color='white')
            model_service.predict(img)
        except Exception as e:
            # Revert model reload
            if current_record:
                settings.model_path = current_record.checkpoint_path
                model_service.reload()
            return jsonify({"detail": f"Model reload failed: {e}. Reverted to previous model."}), 500
            
        # 6. Update deployment history records in MongoDB
        g.deployment_repo.deactivate_all()
        
        new_record = {
            "checkpoint_path": active_model_path,
            "test_accuracy": job.candidate_accuracy,
            "macro_f1": job.candidate_macro_f1,
            "deployed_by": g.current_user["username"],
            "notes": f"Promoted from job {job_id}",
            "is_active": True
        }
        g.deployment_repo.create(new_record)
        
        # Mark job as promoted
        g.training_repo.update(job_id, {"decision": "PROMOTED", "status": "PROMOTED"})
        
        try:
            model_retention.run_model_retention_cleanup()
        except Exception as e:
            logger.error(f"Failed to run model retention after promote: {e}", exc_info=True)
        
        return jsonify({"message": "Model promoted successfully"})
        
    except Exception as exc:
        logger.error(f"Error promoting model: {exc}", exc_info=True)
        return jsonify({"detail": str(exc)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
