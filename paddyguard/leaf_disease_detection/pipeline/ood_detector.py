"""
OOD Detection for leaf image classification.
Flags non-paddy-leaf images or ambiguous predictions using
confidence and entropy thresholds on the softmax output.
"""
import numpy as np
from scipy.stats import entropy as scipy_entropy

CONFIDENCE_THRESHOLD = 0.75
ENTROPY_THRESHOLD     = 0.90
MARGIN_THRESHOLD      = 0.20

def is_out_of_distribution(proba: np.ndarray) -> tuple[bool, str]:
    """Return (is_ood, reason) based on confidence, entropy, and margin."""
    conf     = float(proba.max())
    ent      = float(scipy_entropy(proba, base=2))
    sorted_p = sorted(proba, reverse=True)
    margin   = sorted_p[0] - sorted_p[1]

    if conf < CONFIDENCE_THRESHOLD:
        return True, f"Low confidence ({conf:.3f})"
    if ent > ENTROPY_THRESHOLD:
        return True, f"High entropy ({ent:.3f})"
    if margin < MARGIN_THRESHOLD:
        return True, f"Ambiguous (margin={margin:.3f})"
    return False, ""
