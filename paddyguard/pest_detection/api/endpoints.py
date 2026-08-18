"""C3 API endpoint: /detect"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pipeline.detector import detect_with_ood, load_model
from PIL import Image
import io

router = APIRouter()

# Load model at import time
load_model()

@router.post("/detect")
async def detect_pest(image: UploadFile = File(...)):
    """
    Pipeline:
    1. Receive pest/leaf image
    2. Run YOLOv8 inference
    3. OOD check when no detections clear the confidence threshold
    4. Return pest, confidence, all_scores
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        raw = await image.read()
        pil_image = Image.open(io.BytesIO(raw)).convert("RGB")
        return detect_with_ood(pil_image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
