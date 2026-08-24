import { useMutation } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { voiceService, imageService, type DiagnosisResult } from "../services/api";
import { useDiagnosisStore } from "../store/diagnosisStore";

export interface FollowupState {
  active: boolean;
  question: string | null;
  questionEn: string | null;
  sessionId: string | null;
  questionNumber: number;
  maxQuestions: number;
}

const emptyFollowup: FollowupState = {
  active: false,
  question: null,
  questionEn: null,
  sessionId: null,
  questionNumber: 0,
  maxQuestions: 0,
};

export const useDiagnosis = () => {
  const { setVoiceResult, setLoading, setError } = useDiagnosisStore();
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [followupState, setFollowupState] = useState<FollowupState>(emptyFollowup);

  const applyResult = useCallback(
    (data: DiagnosisResult) => {
      setResult(data);
      setVoiceResult(data);
      if (data.needs_followup && !data.followup_complete) {
        setFollowupState({
          active: true,
          question: data.followup_question,
          questionEn: data.followup_question_en,
          sessionId: data.session_id,
          questionNumber: data.question_number,
          maxQuestions: data.max_questions,
        });
      } else {
        setFollowupState(emptyFollowup);
      }
    },
    [setVoiceResult]
  );

  const diagnoseMutation = useMutation({
    mutationFn: (audioBlob: Blob) => voiceService.diagnose(audioBlob),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      applyResult(data);
      setLoading(false);
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const followupMutation = useMutation({
    mutationFn: (answer: string) =>
      voiceService.followup(answer, followupState.sessionId || ""),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      applyResult(data);
      setLoading(false);
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const clearResult = useCallback(() => {
    setResult(null);
    setFollowupState(emptyFollowup);
  }, []);

  return {
    diagnose: diagnoseMutation.mutate,
    followup: followupMutation.mutate,
    isLoading: diagnoseMutation.isPending || followupMutation.isPending,
    result,
    followupState,
    clearResult,
  };
};

export const useLeafDiagnosis = () => {
  const { setLeafResult, setLoading, setError } = useDiagnosisStore();
  return useMutation({
    mutationFn: (file: File) => imageService.classifyLeaf(file),
    onMutate: () => setLoading(true),
    onSuccess: (data) => {
      setLeafResult(data);
      setLoading(false);
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });
};
