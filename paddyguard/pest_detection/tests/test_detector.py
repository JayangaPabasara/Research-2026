def test_detector_imports():
    from pipeline.detector import detect_with_ood
    assert callable(detect_with_ood)

def test_no_model_returns_error():
    from pipeline import detector
    detector._model = None
    result = detector.detect_with_ood(None)
    assert "error" in result
