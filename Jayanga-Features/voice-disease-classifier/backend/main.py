"""
PaddyGuard AI — FastAPI Backend
Voice-based rice disease diagnosis API.

Endpoints:
  GET  /                    — API info
  GET  /api/v1/health       — health check
  POST /api/v1/diagnose     — full pipeline: audio → disease
  GET  /api/v1/diseases     — list all disease classes
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from config import (
    API_PREFIX, ALLOWED_ORIGINS,
    MAX_AUDIO_SIZE_MB, ALLOWED_AUDIO_TYPES,
    LABEL_MAP, LOG_LEVEL
)
from pipeline import asr, translator, classifier

# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("paddyguard")


# ── Startup / Shutdown ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all ML models once when server starts."""
    logger.info("═" * 50)
    logger.info("  PaddyGuard AI — Starting up")
    logger.info("═" * 50)

    try:
        logger.info("Loading ASR model (Whisper)...")
        asr.load()

        logger.info("Loading disease classifier (SVM)...")
        classifier.load()

        logger.info("═" * 50)
        logger.info("  All models loaded — ready to serve")
        logger.info("═" * 50)
    except FileNotFoundError as e:
        logger.error(f"MODEL FILE MISSING: {e}")
        logger.error("Copy .pkl files to backend/models/ then restart")
        raise

    yield  # app runs here

    logger.info("PaddyGuard AI — Shutting down")


# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "PaddyGuard AI API",
    description = "Voice-based rice disease diagnosis for Sri Lankan farmers",
    version     = "1.0.0",
    lifespan    = lifespan,
)

# CORS — allows React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Response Schemas ──────────────────────────────────────────────────
class DiagnosisResponse(BaseModel):
    success         : bool
    sinhala_text    : str
    english_text    : str
    disease         : str
    label_id        : int
    confidence      : float
    confidence_pct  : str
    needs_followup  : bool
    all_scores      : dict
    processing_ms   : int

class HealthResponse(BaseModel):
    status      : str
    asr_loaded  : bool
    clf_loaded  : bool
    version     : str


# ── Routes ────────────────────────────────────────────────────────────

@app.get("/", tags=["Info"])
async def root():
    return {
        "name"       : "PaddyGuard AI API",
        "version"    : "1.0.0",
        "docs"       : "/docs",
        "health"     : f"{API_PREFIX}/health",
        "diagnose"   : f"{API_PREFIX}/diagnose",
    }


@app.get(f"{API_PREFIX}/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Check if API and models are ready."""
    return HealthResponse(
        status     = "ready" if (asr._loaded and classifier._loaded) else "loading",
        asr_loaded = asr._loaded,
        clf_loaded = classifier._loaded,
        version    = "1.0.0"
    )


@app.get(f"{API_PREFIX}/diseases", tags=["Info"])
async def list_diseases():
    """Return all disease classes the model can detect."""
    return {
        "diseases": [
            {"id": k, "name": v} for k, v in LABEL_MAP.items()
        ]
    }


@app.post(
    f"{API_PREFIX}/diagnose",
    response_model = DiagnosisResponse,
    tags           = ["Diagnosis"],
    summary        = "Diagnose rice disease from voice",
    description    = (
        "Upload a Sinhala voice recording (.ogg/.mp3/.wav). "
        "Returns detected rice disease with confidence score."
    )
)
async def diagnose(
    audio: UploadFile = File(..., description="Sinhala voice recording")
):
    start_time = time.time()

    # ── Validate file ─────────────────────────────────────────────────
    if audio.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail      = f"Unsupported audio type: {audio.content_type}. "
                          f"Supported: ogg, mp3, wav, flac, m4a"
        )

    audio_bytes = await audio.read()

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "Audio file is empty."
        )

    max_bytes = MAX_AUDIO_SIZE_MB * 1024 * 1024
    if len(audio_bytes) > max_bytes:
        raise HTTPException(
            status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail      = f"File too large. Max size: {MAX_AUDIO_SIZE_MB}MB"
        )

    logger.info(
        f"Received audio: {audio.filename} "
        f"({len(audio_bytes)/1024:.1f}KB, {audio.content_type})"
    )

    # ── Step 1: Sinhala Audio → Sinhala Text (Whisper ASR) ───────────
    try:
        sinhala_text = asr.transcribe(audio_bytes, audio.content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Audio processing failed: {e}")
    except Exception as e:
        logger.error(f"ASR error: {e}")
        raise HTTPException(status_code=500, detail="Speech recognition failed.")

    if not sinhala_text:
        raise HTTPException(status_code=400, detail="Could not transcribe audio. Please speak clearly.")

    # ── Step 2: Sinhala Text → English Text (Google Translate) ───────
    try:
        english_text = translator.translate(sinhala_text)
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail="Translation failed. Check internet connection.")

    # ── Step 3: English Text → Disease Classification (SVM) ──────────
    try:
        diagnosis = classifier.classify(english_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail="Disease classification failed.")

    processing_ms = int((time.time() - start_time) * 1000)
    logger.info(f"Pipeline complete in {processing_ms}ms")

    return DiagnosisResponse(
        success        = True,
        sinhala_text   = sinhala_text,
        english_text   = english_text,
        disease        = diagnosis["disease"],
        label_id       = diagnosis["label_id"],
        confidence     = diagnosis["confidence"],
        confidence_pct = f"{diagnosis['confidence']*100:.1f}%",
        needs_followup = diagnosis["needs_followup"],
        all_scores     = diagnosis["all_scores"],
        processing_ms  = processing_ms
    )


# ── Global Error Handler ──────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code = 500,
        content     = {"success": False, "detail": "Internal server error."}
    )


# ── Entry point ───────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    from config import API_HOST, API_PORT

    uvicorn.run(
        "main:app",
        host    = API_HOST,
        port    = API_PORT,
        reload  = True,          # auto-reload on code changes
        log_level = LOG_LEVEL.lower()
    )
