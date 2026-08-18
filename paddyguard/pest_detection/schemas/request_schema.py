from pydantic import BaseModel

class PestDetectionResponse(BaseModel):
    pest: str
    confidence: float
    is_ood: bool
    all_scores: dict
