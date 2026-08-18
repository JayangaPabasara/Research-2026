"""
PaddyGuard AI — C1 Voice NLP Service
Owner: Jayonga Weerasinghe (IT22273680)
Handles: Sinhala ASR -> Translation -> NLP Classification -> OOD -> TTS
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from api.endpoints import router

app = FastAPI(
    title="PaddyGuard AI — Voice NLP Service",
    description="C1: Sinhala voice to rice disease classification",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "voice_nlp", "component": "C1"}

@app.on_event("startup")
async def startup():
    print("[voice_nlp] C1 Voice NLP Service started on port 8001")
    print("[voice_nlp] Loading SVM classifier and TF-IDF vectoriser...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",
                port=int(os.getenv("SERVICE_PORT", 8001)), reload=True)
