"""
ASR Module: Converts Sinhala audio to Sinhala text.
Uses: Lingalingeswaran/whisper-small-sinhala
"""
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import torch, librosa, os

ASR_MODEL_ID = os.getenv("ASR_MODEL_ID", "Lingalingeswaran/whisper-small-sinhala")

_asr_processor = None
_asr_model     = None
_device        = "cuda" if torch.cuda.is_available() else "cpu"

def _load_asr():
    global _asr_processor, _asr_model
    if _asr_processor is None:
        _asr_processor = AutoProcessor.from_pretrained(ASR_MODEL_ID)
        _asr_model     = AutoModelForSpeechSeq2Seq.from_pretrained(ASR_MODEL_ID).to(_device)
        _asr_model.generation_config.language = "sinhala"
        _asr_model.generation_config.task     = "transcribe"

def transcribe_audio(audio_path: str) -> str:
    """Convert audio file to Sinhala text transcript."""
    _load_asr()
    audio_array, _ = librosa.load(audio_path, sr=16000)
    features = _asr_processor(
        audio_array, sampling_rate=16000, return_tensors="pt"
    ).input_features.to(_device)
    with torch.no_grad():
        ids = _asr_model.generate(features)
    return _asr_processor.batch_decode(ids, skip_special_tokens=True)[0]
