"""
PaddyGuard AI — C3 Pest Detection Service
Owner: Kalhara Jayasinghe (IT22065858)
Handles: Image upload -> YOLOv8 pest detection -> OOD
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()
from api.endpoints import router

app = FastAPI(
    title="PaddyGuard AI — Pest Detection",
    description="C3: YOLOv8-based rice pest identification",
    version="1.0.0"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "pest_detection", "component": "C3"}

@app.get("/")
def root():
    return {"message": "PaddyGuard AI Pest Detection service is running"}

@app.on_event("startup")
async def startup():
    print("[pest_detection] C3 service started on port 8003")
    print("[pest_detection] Loading YOLOv8 model...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",
                port=int(os.getenv("SERVICE_PORT", 8003)), reload=True)
