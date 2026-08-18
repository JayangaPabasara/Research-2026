import { useMutation } from "@tanstack/react-query";
import { voiceService, imageService } from "../services/api";
import { useDiagnosisStore } from "../store/diagnosisStore";

export const useVoiceDiagnosis = () => {
  const { setVoiceResult, setLoading, setError } = useDiagnosisStore();
  return useMutation({
    mutationFn: (audioBlob: Blob) => voiceService.diagnose(audioBlob),
    onMutate: () => setLoading(true),
    onSuccess: (data) => { setVoiceResult(data); setLoading(false); },
    onError: (err: Error) => { setError(err.message); setLoading(false); },
  });
};

export const useLeafDiagnosis = () => {
  const { setLeafResult, setLoading, setError } = useDiagnosisStore();
  return useMutation({
    mutationFn: (file: File) => imageService.classifyLeaf(file),
    onMutate: () => setLoading(true),
    onSuccess: (data) => { setLeafResult(data); setLoading(false); },
    onError: (err: Error) => { setError(err.message); setLoading(false); },
  });
};
