import numpy as np

def test_low_confidence_is_ood():
    from pipeline.ood_detector import is_out_of_distribution
    proba = np.array([0.3, 0.3, 0.2, 0.2])
    ood, reason = is_out_of_distribution(proba)
    assert ood is True

def test_confident_prediction_not_ood():
    from pipeline.ood_detector import is_out_of_distribution
    proba = np.array([0.95, 0.02, 0.02, 0.01])
    ood, reason = is_out_of_distribution(proba)
    assert ood is False
