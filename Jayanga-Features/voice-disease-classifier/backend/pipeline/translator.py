"""
PaddyGuard AI — Translation Module
Sinhala text → English text using Google Translate.
Source: deep-translator GoogleTranslator (from your Colab notebook)
"""

import logging
from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)


class SinhalaTranslator:
    """Translates Sinhala text to English."""

    def translate(self, sinhala_text: str) -> str:
        """
        Translate Sinhala text → English.

        Args:
            sinhala_text: output from Whisper ASR

        Returns:
            English translation string
        """
        if not sinhala_text or not sinhala_text.strip():
            logger.warning("Empty text passed to translator")
            return ""

        try:
            # Same as your Colab notebook Cell 3
            translated = GoogleTranslator(
                source="si", target="en"
            ).translate(sinhala_text)

            logger.info(f"English translation: {translated}")
            return translated.strip()

        except Exception as e:
            logger.error(f"Translation failed: {e}")
            raise RuntimeError(f"Translation error: {e}")


# Singleton instance
translator = SinhalaTranslator()
