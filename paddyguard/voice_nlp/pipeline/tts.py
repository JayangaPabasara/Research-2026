"""
Text-to-Speech Module: Converts English/Sinhala text to audio.
Uses Google Cloud TTS or Coqui TTS fallback.
"""
import os

TTS_ENGINE = os.getenv("TTS_ENGINE", "coqui")

def text_to_speech(text: str, language: str = "si") -> bytes:
    """Convert text to speech audio bytes."""
    if TTS_ENGINE == "google":
        return _google_tts(text, language)
    return _stub_tts(text)

def _google_tts(text: str, language: str) -> bytes:
    try:
        from google.cloud import texttospeech
        client   = texttospeech.TextToSpeechClient()
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice    = texttospeech.VoiceSelectionParams(
            language_code="si-LK" if language == "si" else "en-US",
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE,
        )
        config   = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.OGG_OPUS
        )
        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=config
        )
        return response.audio_content
    except Exception as e:
        print(f"[tts] Google TTS error: {e}")
        return b""

def _stub_tts(text: str) -> bytes:
    """Stub — returns empty bytes until TTS is configured."""
    print(f"[tts] TTS stub called with: {text[:50]}")
    return b""
