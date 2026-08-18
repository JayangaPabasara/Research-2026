"""Async HTTP client for inter-service communication."""
import httpx
from typing import Any

async def post_to_service(url: str, json: dict = None,
                          files: dict = None, timeout: float = 60.0) -> Any:
    async with httpx.AsyncClient(timeout=timeout) as client:
        if files:
            return await client.post(url, files=files)
        return await client.post(url, json=json)
