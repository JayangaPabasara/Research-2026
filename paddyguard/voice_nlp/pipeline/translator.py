"""
Translation Module: Sinhala text -> English text.
Uses: Google Translate via deep-translator.
Also applies translation corrections for known
Sinhala cultural terms (kiribath etc.).
"""
from deep_translator import GoogleTranslator

# Known Sinhala cultural term corrections that Google Translate
# mistranslates causing misclassification (e.g. kiribath -> Leaf Blast)
TRANSLATION_CORRECTIONS = {
    "milky rice"       : "diamond shaped gray lesion leaf blast on paddy leaf",
    "milk rice"        : "diamond shaped gray lesion leaf blast on paddy leaf",
    "patches of milky" : "diamond shaped gray spots leaf blast on paddy",
    "rice cake patches": "diamond shaped gray lesion leaf blast",
    "kiribath"         : "diamond shaped gray lesion leaf blast on paddy leaf",
}

def apply_correction(english_text: str) -> str:
    """Correct known mistranslations of Sinhala cultural terms."""
    text_lower = english_text.lower()
    for trigger, correction in TRANSLATION_CORRECTIONS.items():
        if trigger in text_lower:
            return correction
    return english_text

def translate_to_english(sinhala_text: str) -> str:
    """Translate Sinhala text to English and apply corrections."""
    try:
        raw = GoogleTranslator(source="si", target="en").translate(sinhala_text)
        return apply_correction(raw)
    except Exception as e:
        return f"[Translation error: {e}]"
