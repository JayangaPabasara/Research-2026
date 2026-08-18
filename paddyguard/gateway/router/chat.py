"""Routes chatbot requests to C4 treatment_advisory_chatbot service."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import httpx, os

router = APIRouter()
TREATMENT_CHATBOT_URL = os.getenv("TREATMENT_CHATBOT_URL", "http://treatment_advisory_chatbot:8004")

@router.post("/message")
async def send_message(payload: dict):
    """Forward chat message to C4 RAG chatbot."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{TREATMENT_CHATBOT_URL}/chat", json=payload)
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Treatment chatbot service unavailable")
