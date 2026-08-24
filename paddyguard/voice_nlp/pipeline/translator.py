"""
Translation Module: Sinhala text -> English text.
Uses: Google Translate via deep-translator, with retries
(the free scraped endpoint is intermittently flaky/rate-limited)
and a MyMemory fallback if Google keeps failing.
Also applies translation corrections for known
Sinhala cultural terms (kiribath etc.).
"""
import time
from deep_translator import GoogleTranslator, MyMemoryTranslator

GOOGLE_RETRIES = 3
GOOGLE_RETRY_DELAY_SECONDS = 1.0

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
    last_error = None
    for attempt in range(GOOGLE_RETRIES):
        try:
            raw = GoogleTranslator(source="si", target="en").translate(sinhala_text)
            return apply_correction(raw)
        except Exception as e:
            last_error = e
            if attempt < GOOGLE_RETRIES - 1:
                time.sleep(GOOGLE_RETRY_DELAY_SECONDS)

    try:
        raw = MyMemoryTranslator(source="si-LK", target="en-GB").translate(sinhala_text)
        return apply_correction(raw)
    except Exception:
        return f"[Translation error: {last_error}]"
