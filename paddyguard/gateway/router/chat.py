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


@router.get("/topics")
async def list_topics():
    """Forward to C4's GET /chat/topics — the scoped disease/pest list the frontend renders as suggestion chips."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{TREATMENT_CHATBOT_URL}/chat/topics")
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Treatment chatbot service unavailable")


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Forward to C4's DELETE /chat/session/:sessionId — used when the user starts a new chat."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(f"{TREATMENT_CHATBOT_URL}/chat/session/{session_id}")
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Treatment chatbot service unavailable")
