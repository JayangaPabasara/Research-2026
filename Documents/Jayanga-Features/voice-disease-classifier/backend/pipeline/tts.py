# Simple TTS with gTTS — add to backend/pipeline/tts.py
from gtts import gTTS
import io

def speak_sinhala(text: str) -> bytes:
    tts = gTTS(text=text, lang='si')
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    return buf.getvalue()