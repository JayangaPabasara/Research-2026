"""Routes auth requests to user_management service."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import httpx, os

router = APIRouter()
USER_MGMT_URL = os.getenv("USER_MGMT_URL", "http://user_management:8005")

@router.post("/register")
async def register(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{USER_MGMT_URL}/register", json=payload)
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="User management service unavailable")

@router.post("/login")
async def login(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{USER_MGMT_URL}/login", json=payload)
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="User management service unavailable")
