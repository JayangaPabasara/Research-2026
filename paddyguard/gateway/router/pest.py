"""Routes pest image requests to C3 pest_detection service."""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import httpx, os

router = APIRouter()
PEST_DETECTION_URL = os.getenv("PEST_DETECTION_URL", "http://pest_detection:8003")

@router.post("/detect")
async def detect_pest(image: UploadFile = File(...)):
    """Forward pest image to C3 for pest identification."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {"image": (image.filename, await image.read(), image.content_type)}
            response = await client.post(f"{PEST_DETECTION_URL}/detect", files=files)
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Pest detection service unavailable")
