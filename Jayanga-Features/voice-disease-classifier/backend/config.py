"""
PaddyGuard AI — Backend Configuration
All settings in one place. Change values here only.
"""

import os
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"

CLASSIFIER_PATH = MODELS_DIR / "paddyguard_best_classifier.pkl"
TFIDF_PATH      = MODELS_DIR / "paddyguard_tfidf.pkl"

# ── ASR Model ─────────────────────────────────────────────────────────
ASR_MODEL_ID = "Lingalingeswaran/whisper-small-sinhala"
ASR_LANGUAGE = "sinhala"
ASR_TASK     = "transcribe"
AUDIO_SAMPLE_RATE = 16000

# ── Classifier ────────────────────────────────────────────────────────
LABEL_MAP = {
    0: "Bacterial Blight",
    1: "Leaf Blast",
    2: "Brown Spot",
    3: "Healthy"
}

CONFIDENCE_THRESHOLD = 0.70   # τ = 0.70 (from your research proposal)

# ── API ───────────────────────────────────────────────────────────────
API_HOST    = os.getenv("API_HOST", "0.0.0.0")
API_PORT    = int(os.getenv("API_PORT", 8000))
API_VERSION = "v1"
API_PREFIX  = f"/api/{API_VERSION}"

# Allowed frontend origins (CORS)
ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",   # fallback
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# ── Audio Upload ──────────────────────────────────────────────────────
MAX_AUDIO_SIZE_MB  = 25
ALLOWED_AUDIO_TYPES = [
    "audio/wav", "audio/wave",
    "audio/ogg", "audio/mpeg",
    "audio/mp3", "audio/flac",
    "audio/m4a", "audio/mp4",
    "audio/webm",                    # ← ADD THIS
    "audio/webm;codecs=opus",        # ← ADD THIS
    "audio/webm; codecs=opus",       # ← ADD THIS (with space)
    "application/octet-stream",
]

# ── Logging ───────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
