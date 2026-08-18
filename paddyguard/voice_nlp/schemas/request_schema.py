from pydantic import BaseModel
from typing import Optional

class FollowUpRequest(BaseModel):
    answer: str
    session_id: str
    previous_prediction: Optional[str] = None

class DiagnosisResponse(BaseModel):
    disease: str
    label_id: int
    confidence: float
    is_ood: bool
    needs_followup: bool
    ood_reason: Optional[str]
    status: str
    message: Optional[str]
    all_scores: dict
    sinhala_transcript: Optional[str] = None
    english_translation: Optional[str] = None
