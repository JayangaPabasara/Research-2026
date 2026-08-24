"""Routes auth requests to user_management service."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import httpx, os

router = APIRouter()
USER_MGMT_URL = os.getenv("USER_MGMT_URL", "http://user_management:8005")


async def _forward(request: Request, method: str, path: str, json=None):
    headers = {}
    auth = request.headers.get("Authorization")
    if auth:
        headers["Authorization"] = auth
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(method, f"{USER_MGMT_URL}{path}", headers=headers, json=json)
        try:
            content = response.json()
        except ValueError:
            content = {"detail": response.text}
        return JSONResponse(status_code=response.status_code, content=content)
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="User management service unavailable")


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


@router.post("/refresh")
async def refresh(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{USER_MGMT_URL}/refresh", json=payload)
            return JSONResponse(status_code=response.status_code, content=response.json())
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="User management service unavailable")


@router.get("/me")
async def me(request: Request):
    return await _forward(request, "GET", "/me")


@router.patch("/me")
async def update_me(request: Request):
    body = await request.json()
    return await _forward(request, "PATCH", "/me", json=body)
