# backend/pipeline/classifier.py
# Replace the classify() method with this complete version

import re
import logging
import joblib
import numpy as np
from scipy.stats import entropy as scipy_entropy

from config import (
    CLASSIFIER_PATH, TFIDF_PATH,
    LABEL_MAP, CONFIDENCE_THRESHOLD
)

logger = logging.getLogger(__name__)

# ── OOD thresholds ───────────────────────────────────────────────────
OOD_THRESHOLD      = 0.50   # below this confidence → OOD
FOLLOWUP_THRESHOLD = 0.70   # between 0.50–0.70 → ask follow-up
ENTROPY_THRESHOLD  = 1.20   # above this entropy → OOD

# ── Symptom vocabulary ───────────────────────────────────────────────
# If NONE of these words appear in the input → instantly OOD
SYMPTOM_VOCABULARY = {
    'leaf', 'leaves', 'paddy', 'rice', 'plant', 'stem',
    'spot', 'spots', 'lesion', 'lesions', 'stripe', 'yellow',
    'brown', 'grey', 'gray', 'white', 'ooze', 'blast', 'blight',
    'disease', 'healthy', 'green', 'blade', 'margin', 'vein',
    'tip', 'node', 'neck', 'grain', 'panicle', 'seedling',
    'tiller', 'oval', 'circular', 'diamond', 'spindle', 'dots',
    'marks', 'wilting', 'wilt', 'rot', 'halo', 'necrotic',
    'kresek', 'scattered', 'dense', 'discoloration', 'fungal',
    'bacterial', 'infection', 'water', 'soaked', 'symptom',
    'color', 'colour', 'dark', 'pale', 'light', 'edge', 'border',
    'center', 'centre', 'ring', 'patch', 'patches', 'growth',
    'stunted', 'smell', 'root', 'roots', 'milky', 'creamy'
}


class DiseaseClassifier:

    def __init__(self):
        self.classifier = None
        self.tfidf      = None
        self._loaded    = False

    def load(self):
        if self._loaded:
            return
        if not CLASSIFIER_PATH.exists():
            raise FileNotFoundError(
                f"Classifier not found: {CLASSIFIER_PATH}\n"
                "Copy paddyguard_best_classifier.pkl to backend/models/"
            )
        if not TFIDF_PATH.exists():
            raise FileNotFoundError(
                f"TF-IDF not found: {TFIDF_PATH}\n"
                "Copy paddyguard_tfidf.pkl to backend/models/"
            )
        logger.info(f"Loading classifier from: {CLASSIFIER_PATH}")
        self.classifier = joblib.load(CLASSIFIER_PATH)
        self.tfidf      = joblib.load(TFIDF_PATH)
        self._loaded    = True
        logger.info("✅ Disease classifier loaded")

    def _preprocess(self, text: str) -> str:
        text = str(text).lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _has_symptom_words(self, text: str) -> bool:
        """Check if input contains at least one known symptom word."""
        words = set(text.lower().split())
        return bool(words & SYMPTOM_VOCABULARY)

    def classify(self, english_text: str) -> dict:
        """
        Classify with 3-signal OOD detection:
          Signal 1 — vocabulary check (no symptom words → OOD)
          Signal 2 — confidence threshold (< 0.50 → OOD)
          Signal 3 — entropy check (> 1.20 → OOD)
        """
        if not self._loaded:
            raise RuntimeError("Classifier not loaded.")

        if not english_text or not english_text.strip():
            raise ValueError("Empty text cannot be classified.")

        # ── Signal 1: vocabulary check ────────────────────────────────
        if not self._has_symptom_words(english_text):
            logger.info(f"OOD (vocab): '{english_text}'")
            return {
                "disease"        : "Unknown Input",
                "label_id"       : -1,
                "confidence"     : 0.0,
                "is_ood"         : True,
                "needs_followup" : False,
                "ood_reason"     : "No disease-related vocabulary detected",
                "all_scores"     : {LABEL_MAP[i]: 0.0 for i in range(4)},
                "message"        : "Input does not appear to be a rice disease "
                                   "description. Please describe your paddy plant symptoms."
            }

        # ── Signal 2 & 3: confidence + entropy ───────────────────────
        clean      = self._preprocess(english_text)
        vec        = self.tfidf.transform([clean])
        proba      = self.classifier.predict_proba(vec)[0]
        confidence = float(proba.max())
        label_id   = int(np.argmax(proba))
        ent        = float(scipy_entropy(proba, base=2))
        all_scores = {LABEL_MAP[i]: round(float(p), 4) for i, p in enumerate(proba)}

        # OOD if EITHER signal fires
        if confidence < OOD_THRESHOLD or ent > ENTROPY_THRESHOLD:
            reasons = []
            if confidence < OOD_THRESHOLD:
                reasons.append(f"low confidence ({confidence:.2f})")
            if ent > ENTROPY_THRESHOLD:
                reasons.append(f"high entropy ({ent:.2f})")
            logger.info(f"OOD ({', '.join(reasons)}): '{english_text}'")
            return {
                "disease"        : "Unknown Input",
                "label_id"       : -1,
                "confidence"     : round(confidence, 4),
                "is_ood"         : True,
                "needs_followup" : False,
                "ood_reason"     : " + ".join(reasons),
                "all_scores"     : all_scores,
                "message"        : "Input does not appear to be a rice disease "
                                   "description. Please describe your paddy plant symptoms."
            }

        # ── In-distribution result ─────────────────────────────────────
        needs_followup = confidence < FOLLOWUP_THRESHOLD
        logger.info(
            f"Classified as '{LABEL_MAP[label_id]}' "
            f"(confidence={confidence:.1%}, follow_up={needs_followup})"
        )
        return {
            "disease"        : LABEL_MAP[label_id],
            "label_id"       : label_id,
            "confidence"     : round(confidence, 4),
            "is_ood"         : False,
            "needs_followup" : needs_followup,
            "ood_reason"     : None,
            "all_scores"     : all_scores,
            "message"        : None
        }


# Singleton
classifier = DiseaseClassifier()