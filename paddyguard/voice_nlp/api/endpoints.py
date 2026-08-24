"""
C1 API endpoints: /diagnose and /followup
Owner: Jayonga Weerasinghe (IT22273680)

Changes from v2:
- Follow-up questions returned in Sinhala (farmer-friendly)
- Both Sinhala + English question returned in response
- Farmer can answer in Sinhala (ඔව්/නෑ) or English (yes/no)
- resolve_answer() converts Sinhala yes/no → English SVM keywords
- Error messages translated to Sinhala
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from pipeline.asr import transcribe_audio
from pipeline.translator import translate_to_english
from pipeline.classifier import classify_with_ood
from pipeline.followup import get_followup_question, resolve_answer
from pipeline.session_store import (
    create_session,
    get_session,
    update_session,
    delete_session,
)

import tempfile, os, logging

logger = logging.getLogger("voice_nlp.endpoints")

router = APIRouter()

MAX_FOLLOWUP_QUESTIONS = 3


# ── Request / Response schemas ─────────────────────────────────────────────

class FollowUpRequest(BaseModel):
    answer: str
    session_id: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _save_temp_audio(audio_bytes: bytes, suffix: str) -> str:
    """Write audio bytes to a temp file and return its path."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        return tmp.name


def _cleanup(path: str) -> None:
    """Silently remove a temp file."""
    try:
        os.unlink(path)
    except OSError:
        pass


# ── POST /diagnose ─────────────────────────────────────────────────────────

@router.post("/diagnose")
async def diagnose(audio: UploadFile = File(...)):
    """
    Full pipeline:
    1. Receive Sinhala audio file
    2. ASR  : audio  → Sinhala text  (Whisper)
    3. Trans : Sinhala → English text (Google Translate)
    4. Classify: English text → disease + OOD check (SVM + 5-signal OOD v4.1)
    5a. Confident  (conf ≥ 0.75)  → return disease result directly
    5b. Low conf   (0.50–0.75)    → create Redis session, return first
                                    follow-up question in SINHALA
    5c. OOD        (conf < 0.50)  → return OOD rejection message
    """

    # ── Validate content type ──────────────────────────────────────────
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400,
            detail=f"ගොනුව ශ්‍රව්‍ය ගොනුවක් විය යුතුය. ලැබුණේ: {audio.content_type}"
        )

    # ── Read audio bytes ───────────────────────────────────────────────
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=400,
            detail="ශ්‍රව්‍ය ගොනුව හිස්ය. නැවත උත්සාහ කරන්න."
        )

    suffix   = os.path.splitext(audio.filename or "")[1] or ".ogg"
    tmp_path = _save_temp_audio(audio_bytes, suffix)

    try:
        # Step 1 — ASR: audio → Sinhala text
        logger.info("ASR: transcribing audio (%d bytes)...", len(audio_bytes))
        sinhala_text = transcribe_audio(tmp_path)
        if not sinhala_text or not sinhala_text.strip():
            raise HTTPException(
                status_code=400,
                detail="හඬ හඳුනා ගත නොහැකි විය. කරුණාකර පැහැදිලිව කතා කර නැවත උත්සාහ කරන්න."
            )
        logger.info("ASR result: %s", sinhala_text)

        # Step 2 — Translate: Sinhala → English
        english_text = translate_to_english(sinhala_text)
        logger.info("Translation: %s", english_text)

        # Step 3 — Classify + OOD check
        result = classify_with_ood(english_text)
        logger.info(
            "Classification: %s  conf=%.3f  ood=%s  followup=%s",
            result["disease"], result["confidence"],
            result["is_ood"], result["needs_followup"]
        )

        # Step 4 — Handle follow-up: create session + attach first question
        if result["needs_followup"] and not result["is_ood"]:
            session_id    = create_session(
                disease    = result["disease"],
                confidence = result["confidence"],
            )
            # get_followup_question now returns a dict with sinhala + english
            question_dict = get_followup_question(
                disease_prediction = result["disease"],
                question_index     = 0,
            )
            # Store question dict in session so /followup can resolve yes/no
            update_session(session_id, {
                "disease"        : result["disease"],
                "confidence"     : result["confidence"],
                "question_index" : 0,
                "answers"        : [],
                "question_dict"  : question_dict,   # ← stored for resolve_answer()
            })
            return {
                **result,
                "sinhala_transcript"  : sinhala_text,
                "english_translation" : english_text,
                "session_id"          : session_id,
                "followup_question"   : question_dict["sinhala"],   # shown to farmer
                "followup_question_en": question_dict["english"],   # for logging/debug
                "question_number"     : 1,
                "max_questions"       : MAX_FOLLOWUP_QUESTIONS,
            }

        # Step 5 — OOD or confident result — no session needed
        return {
            **result,
            "sinhala_transcript"  : sinhala_text,
            "english_translation" : english_text,
            "session_id"          : None,
            "followup_question"   : None,
            "followup_question_en": None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Pipeline error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"රෝග විනිශ්චය අසාර්ථක විය: {str(e)}"
        )
    finally:
        _cleanup(tmp_path)


# ── POST /followup ─────────────────────────────────────────────────────────

@router.post("/followup")
async def followup(req: FollowUpRequest):
    """
    Accept farmer's follow-up answer in Sinhala (ඔව්/නෑ) or English (yes/no).

    Flow:
    - Load session from Redis using session_id
    - Retrieve stored question_dict so we can resolve yes/no → SVM keywords
    - resolve_answer() converts ඔව් → English symptom keywords for SVM
    - Re-classify using resolved English text
    - If still low confidence AND questions remaining → return next Sinhala question
    - If confident OR max questions reached → delete session, return final result
    """

    # ── Load session ───────────────────────────────────────────────────
    session = get_session(req.session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "සැසිය හමු නොවීය හෝ කල් ඉකුත් විය. "
                "කරුණාකර නව රෝග විනිශ්චයක් ආරම්භ කරන්න."
            )
        )

    question_index = session.get("question_index", 0)
    disease        = session.get("disease", "")
    answers        = session.get("answers", [])
    question_dict  = session.get("question_dict", {})   # ← stored from /diagnose

    # ── Guard: reject if somehow over max ─────────────────────────────
    if question_index >= MAX_FOLLOWUP_QUESTIONS:
        delete_session(req.session_id)
        raise HTTPException(
            status_code=400,
            detail=(
                "උපරිම ප්‍රශ්න ගණන ඉක්මවා ඇත. "
                "කරුණාකර නව රෝග විනිශ්චයක් ආරම්භ කරන්න."
            )
        )

    # ── Resolve Sinhala yes/no → English SVM keywords ─────────────────
    # ඔව් → yes_hint: "round oval brown spot yellow halo ring fungal"
    # නෑ  → no_hint:  "no round oval spots"
    # free text → pass as-is, SVM classifies directly
    english_answer = resolve_answer(req.answer, question_dict)

    logger.info(
        "Follow-up Q%d  raw='%s'  resolved='%s'",
        question_index + 1, req.answer, english_answer
    )

    # ── Append raw Sinhala answer to history ──────────────────────────
    answers.append(req.answer.strip())
    next_index = question_index + 1

    # ── Re-classify using resolved English answer ──────────────────────
    result = classify_with_ood(english_answer)

    logger.info(
        "Follow-up Q%d result: %s  conf=%.3f  followup=%s",
        question_index + 1,
        result["disease"], result["confidence"], result["needs_followup"]
    )

    # ── Decide: more questions OR final result ─────────────────────────
    still_unsure   = result["needs_followup"] and not result["is_ood"]
    questions_left = next_index < MAX_FOLLOWUP_QUESTIONS

    if still_unsure and questions_left:
        # Get next bilingual question
        next_question_dict = get_followup_question(
            disease_prediction = result["disease"],
            question_index     = next_index,
        )
        # Update session with new state + next question dict
        update_session(req.session_id, {
            "disease"       : result["disease"],
            "confidence"    : result["confidence"],
            "question_index": next_index,
            "answers"       : answers,
            "question_dict" : next_question_dict,   # ← update for next /followup call
        })
        return {
            **result,
            "session_id"          : req.session_id,
            "followup_question"   : next_question_dict["sinhala"],   # shown to farmer
            "followup_question_en": next_question_dict["english"],   # for logging
            "question_number"     : next_index + 1,
            "max_questions"       : MAX_FOLLOWUP_QUESTIONS,
        }

    # ── Final result — clean up session ───────────────────────────────
    delete_session(req.session_id)

    logger.info(
        "Follow-up complete after %d question(s). Final: %s  conf=%.3f",
        next_index, result["disease"], result["confidence"]
    )

    return {
        **result,
        "session_id"          : None,
        "followup_question"   : None,
        "followup_question_en": None,
        "question_number"     : next_index,
        "max_questions"       : MAX_FOLLOWUP_QUESTIONS,
        "followup_complete"   : True,
    }