from PIL import Image

def test_classifier_imports():
    from pipeline.classifier import classify_with_ood
    assert callable(classify_with_ood)

def test_classify_returns_expected_keys():
    from pipeline.classifier import load_model, classify_with_ood
    load_model()
    img = Image.new("RGB", (300, 300))
    result = classify_with_ood(img)
    assert "is_ood" in result
    assert "confidence" in result
