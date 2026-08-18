"""Routes leaf image requests to C2 leaf_disease_detection service."""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import httpx, os

router = APIRouter()
LEAF_DISEASE_URL = os.getenv("LEAF_DISEASE_URL", "http://leaf_disease_detection:8002")

@router.post("/classify")
async def classify_leaf(image: UploadFile = File(...)):
    """Forward leaf image to C2 for disease classification."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {"image": (image.filename, await image.read(), image.content_type)}
            response = await client.post(f"{LEAF_DISEASE_URL}/classify", files=files)
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Leaf disease service unavailable")
