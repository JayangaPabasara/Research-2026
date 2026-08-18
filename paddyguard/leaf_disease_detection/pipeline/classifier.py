"""
CNN Classifier for rice leaf disease images.
Loads a PyTorch EfficientNet-B3 model fine-tuned on 4 classes.
"""
import torch, torch.nn.functional as F
import os
from torchvision import models
from pipeline.preprocessor import preprocess_image
from pipeline.ood_detector import is_out_of_distribution

LABEL_MAP = {0: "Bacterial Blight", 1: "Leaf Blast",
             2: "Brown Spot",       3: "Healthy"}

_model  = None
_device = "cuda" if torch.cuda.is_available() else "cpu"

def _build_model(num_classes: int = 4):
    model = models.efficientnet_b3(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = torch.nn.Linear(in_features, num_classes)
    return model

def load_model():
    global _model
    model_path = os.getenv("MODEL_PATH", "models/best_model.pth")
    _model = _build_model()
    if os.path.exists(model_path):
        state_dict = torch.load(model_path, map_location=_device)
        _model.load_state_dict(state_dict)
        print(f"[classifier] Model loaded from {model_path}")
    else:
        print(f"[classifier] WARNING: Model file not found. Place best_model.pth in /models/")
    _model.to(_device)
    _model.eval()

def classify_with_ood(pil_image) -> dict:
    """Run CNN inference on a leaf image and apply OOD detection."""
    if _model is None:
        return {"error": "Model not loaded. Upload best_model.pth to /models/"}

    tensor = preprocess_image(pil_image).to(_device)
    with torch.no_grad():
        logits = _model(tensor)
        proba  = F.softmax(logits, dim=1).cpu().numpy()[0]

    label_id = int(proba.argmax())
    conf     = float(proba.max())
    scores   = {LABEL_MAP[i]: round(float(p), 4) for i, p in enumerate(proba)}

    ood, reason = is_out_of_distribution(proba)
    if ood:
        return {
            "disease"    : "Unknown / OOD",
            "label_id"   : -1,
            "confidence" : round(conf, 4),
            "is_ood"     : True,
            "ood_reason" : reason,
            "all_scores" : scores,
        }

    return {
        "disease"    : LABEL_MAP[label_id],
        "label_id"   : label_id,
        "confidence" : round(conf, 4),
        "is_ood"     : False,
        "ood_reason" : None,
        "all_scores" : scores,
    }
