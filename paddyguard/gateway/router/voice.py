"""Routes voice requests to C1 voice_nlp service."""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import httpx, os

router = APIRouter()
VOICE_NLP_URL = os.getenv("VOICE_NLP_URL", "http://voice_nlp:8001")

@router.post("/diagnose")
async def diagnose_voice(audio: UploadFile = File(...)):
    """Forward audio file to C1 voice_nlp service for diagnosis.

    Timeout is generous: the first Whisper ASR call after a cold start can
    take several minutes before the model is warm.
    """
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            files = {"audio": (audio.filename, await audio.read(), audio.content_type)}
            response = await client.post(f"{VOICE_NLP_URL}/diagnose", files=files)
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Voice NLP service unavailable")
    except httpx.ReadTimeout:
        raise HTTPException(status_code=504, detail="Voice NLP service timed out")

@router.post("/followup")
async def followup(payload: dict):
    """Forward follow-up answer to C1 for continued diagnosis."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{VOICE_NLP_URL}/followup", json=payload)
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Voice NLP service unavailable")
