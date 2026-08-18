"""C1 API endpoints: /diagnose and /followup"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from pipeline.asr import transcribe_audio
from pipeline.translator import translate_to_english
from pipeline.classifier import classify_with_ood, load_models
import tempfile, os

router = APIRouter()

# Load models at import time
load_models()

class FollowUpRequest(BaseModel):
    answer: str
    session_id: str

@router.post("/diagnose")
async def diagnose(audio: UploadFile = File(...)):
    """
    Full pipeline:
    1. Receive Sinhala audio file
    2. ASR: audio -> Sinhala text (Whisper)
    3. Translate: Sinhala -> English (Google Translate)
    4. Classify: English text -> disease (SVM + OOD v4)
    5. Return result with confidence score
    """
    if not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    # Save to temp file for librosa
    suffix = os.path.splitext(audio.filename)[1] or ".ogg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        sinhala_text  = transcribe_audio(tmp_path)
        english_text  = translate_to_english(sinhala_text)
        result        = classify_with_ood(english_text)
        return {
            **result,
            "sinhala_transcript" : sinhala_text,
            "english_translation": english_text,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)

@router.post("/followup")
async def followup(req: FollowUpRequest):
    """
    Accept farmer's follow-up answer and re-classify.
    Called when initial confidence is between OOD and FOLLOWUP threshold.
    """
    result = classify_with_ood(req.answer)
    return {**result, "session_id": req.session_id}
