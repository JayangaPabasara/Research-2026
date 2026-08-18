from pydantic import BaseModel
from typing import Optional

class LeafClassificationResponse(BaseModel):
    disease: str
    label_id: int
    confidence: float
    is_ood: bool
    ood_reason: Optional[str] = None
    gradcam_url: Optional[str] = None
    all_scores: dict
