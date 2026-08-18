"""C2 API endpoint: /classify"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pipeline.classifier import classify_with_ood, load_model
from pipeline.gradcam import generate_gradcam
from pipeline.s3_uploader import upload_gradcam
from PIL import Image
import io

router = APIRouter()

# Load model at import time
load_model()

@router.post("/classify")
async def classify_leaf(image: UploadFile = File(...)):
    """
    Pipeline:
    1. Receive leaf image
    2. Preprocess -> CNN inference
    3. OOD check on confidence/entropy
    4. Generate Grad-CAM heatmap and upload to S3
    5. Return disease, confidence, gradcam_url, all_scores
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        raw = await image.read()
        pil_image = Image.open(io.BytesIO(raw)).convert("RGB")
        result = classify_with_ood(pil_image)

        gradcam_url = None
        if not result["is_ood"]:
            heatmap = generate_gradcam(pil_image, result["label_id"])
            gradcam_url = upload_gradcam(heatmap, image.filename)

        return {**result, "gradcam_url": gradcam_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
