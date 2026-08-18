"""
PaddyGuard AI — ASR Module (fixed WebM support)
"""

import io
import os
import logging
import tempfile
import numpy as np
import torch
import librosa
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq

from config import ASR_MODEL_ID, ASR_LANGUAGE, ASR_TASK, AUDIO_SAMPLE_RATE

logger = logging.getLogger(__name__)

# Map content-type → file extension so librosa knows the format
CONTENT_TYPE_TO_EXT = {
    "audio/webm"              : ".webm",
    "audio/webm;codecs=opus"  : ".webm",
    "audio/webm; codecs=opus" : ".webm",
    "audio/ogg"               : ".ogg",
    "audio/mpeg"              : ".mp3",
    "audio/mp3"               : ".mp3",
    "audio/wav"               : ".wav",
    "audio/wave"              : ".wav",
    "audio/flac"              : ".flac",
    "audio/m4a"               : ".m4a",
    "audio/mp4"               : ".mp4",
    "application/octet-stream": ".webm",   # browser fallback
}


class SinhalaASR:

    def __init__(self):
        self.processor = None
        self.model     = None
        self.device    = None
        self._loaded   = False

    def load(self):
        if self._loaded:
            return
        logger.info(f"Loading ASR model: {ASR_MODEL_ID}")
        self.device    = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        self.processor = AutoProcessor.from_pretrained(ASR_MODEL_ID)
        self.model     = AutoModelForSpeechSeq2Seq.from_pretrained(ASR_MODEL_ID)
        self.model     = self.model.to(self.device)
        self.model.generation_config.language = ASR_LANGUAGE
        self.model.generation_config.task     = ASR_TASK
        self._loaded   = True
        logger.info("✅ ASR model loaded successfully")

    def transcribe(self, audio_bytes: bytes, content_type: str = "audio/webm") -> str:
        if not self._loaded:
            raise RuntimeError("ASR model not loaded.")

        # Normalise content-type (remove spaces around semicolon)
        ct_clean = content_type.strip().lower().replace(" ", "")

        # Get file extension — librosa needs this to pick the right decoder
        ext = CONTENT_TYPE_TO_EXT.get(ct_clean, ".webm")

        # Write bytes to a real temp file with correct extension
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                suffix=ext, delete=False
            ) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            logger.debug(f"Temp file: {tmp_path} ({len(audio_bytes)/1024:.1f}KB)")

            # librosa reads from the file path — extension tells it the format
            audio_array, _ = librosa.load(
                tmp_path, sr=AUDIO_SAMPLE_RATE, mono=True
            )

        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            raise ValueError(f"Could not decode audio file: {e}")
        finally:
            # Always clean up temp file
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

        if len(audio_array) == 0:
            raise ValueError("Audio file is empty or could not be decoded.")

        # Transcribe — same as your Colab notebook
        input_features = self.processor(
            audio_array,
            sampling_rate=AUDIO_SAMPLE_RATE,
            return_tensors="pt"
        ).input_features.to(self.device)

        with torch.no_grad():
            predicted_ids = self.model.generate(input_features)

        transcript = self.processor.batch_decode(
            predicted_ids, skip_special_tokens=True
        )[0].strip()

        logger.info(f"Sinhala transcript: {transcript}")
        return transcript


asr = SinhalaASR()