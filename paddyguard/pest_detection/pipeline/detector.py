"""
YOLOv8 Pest Detector.
Loads a fine-tuned YOLOv8 model and detects common rice pests.
"""
import os
import numpy as np
from ultralytics import YOLO

PEST_LABELS = {
    0: "Brown Planthopper",
    1: "Rice Leaf Folder",
    2: "Stem Borer",
    3: "Rice Bug",
    4: "Green Leafhopper",
}

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.5))

_model = None

def load_model():
    global _model
    model_path = os.getenv("MODEL_PATH", "models/pest_yolov8.pt")
    if os.path.exists(model_path):
        _model = YOLO(model_path)
        print(f"[detector] Model loaded from {model_path}")
    else:
        print(f"[detector] WARNING: Model file not found. Place pest_yolov8.pt in /models/")

def detect_with_ood(pil_image) -> dict:
    """Run YOLOv8 inference and apply an OOD gate on detection confidence."""
    if _model is None:
        return {"error": "Model not loaded. Upload pest_yolov8.pt to /models/"}

    results = _model.predict(pil_image, verbose=False)[0]
    boxes   = results.boxes

    if boxes is None or len(boxes) == 0:
        return {
            "pest"       : "Unknown / OOD",
            "confidence" : 0.0,
            "is_ood"     : True,
            "all_scores" : {label: 0.0 for label in PEST_LABELS.values()},
        }

    confs     = boxes.conf.cpu().numpy()
    class_ids = boxes.cls.cpu().numpy().astype(int)
    best_idx  = int(np.argmax(confs))
    best_conf = float(confs[best_idx])
    best_cls  = int(class_ids[best_idx])

    scores = {label: 0.0 for label in PEST_LABELS.values()}
    for conf, cls_id in zip(confs, class_ids):
        label = PEST_LABELS.get(int(cls_id), "Unknown")
        scores[label] = max(scores.get(label, 0.0), round(float(conf), 4))

    if best_conf < CONFIDENCE_THRESHOLD:
        return {
            "pest"       : "Unknown / OOD",
            "confidence" : round(best_conf, 4),
            "is_ood"     : True,
            "all_scores" : scores,
        }

    return {
        "pest"       : PEST_LABELS.get(best_cls, "Unknown"),
        "confidence" : round(best_conf, 4),
        "is_ood"     : False,
        "all_scores" : scores,
    }
