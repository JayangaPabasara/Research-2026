# voice_nlp/pipeline/db.py
# leaf_disease_detection/pipeline/db.py   ← same file, paste in each service
# pest_detection/pipeline/db.py
"""
MongoDB logging for this service.
Each service has its own copy — microservice independence.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os, logging

logger  = logging.getLogger(__name__)
_client = None

def _get_db():
    global _client
    if _client is None:
        url     = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        _client = AsyncIOMotorClient(url)
        logger.info("MongoDB connected")
    return _client["paddyguard"]

async def log_diagnosis(payload: dict) -> None:
    """Insert one diagnosis log record. Never raises — logging must not break pipeline."""
    try:
        db = _get_db()
        await db.diagnoses.insert_one({
            **payload,
            "timestamp": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.error("MongoDB log failed (non-fatal): %s", e)