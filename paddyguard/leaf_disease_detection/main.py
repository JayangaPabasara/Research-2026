"""
PaddyGuard AI — C2 Leaf Disease Classification Service
Owner: Lasiru Hewanayake (IT22168740)
Handles: Image upload -> CNN classification -> OOD -> Grad-CAM
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()
from api.endpoints import router

app = FastAPI(
    title="PaddyGuard AI — Leaf Disease Detection",
    description="C2: CNN-based rice leaf disease classification with Grad-CAM",
    version="1.0.0"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "leaf_disease_detection", "component": "C2"}

@app.get("/")
def root():
    return {"message": "PaddyGuard AI Leaf Disease Detection service is running"}

@app.on_event("startup")
async def startup():
    print("[leaf_disease_detection] C2 service started on port 8002")
    print("[leaf_disease_detection] Loading CNN classifier...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",
                port=int(os.getenv("SERVICE_PORT", 8002)), reload=True)
