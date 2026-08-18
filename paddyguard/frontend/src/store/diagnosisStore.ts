import { create } from "zustand";
import type {
  DiagnosisResult,
  LeafResult,
  PestResult,
  TreatmentResult,
} from "../services/api";

interface DiagnosisState {
  voiceResult: DiagnosisResult | null;
  leafResult: LeafResult | null;
  pestResult: PestResult | null;
  treatmentResult: TreatmentResult | null;
  sessionId: string;
  isLoading: boolean;
  error: string | null;
  setVoiceResult: (result: DiagnosisResult) => void;
  setLeafResult: (result: LeafResult) => void;
  setPestResult: (result: PestResult) => void;
  setTreatmentResult: (result: TreatmentResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAll: () => void;
}

export const useDiagnosisStore = create<DiagnosisState>((set) => ({
  voiceResult: null,
  leafResult: null,
  pestResult: null,
  treatmentResult: null,
  sessionId: crypto.randomUUID(),
  isLoading: false,
  error: null,
  setVoiceResult: (result) => set({ voiceResult: result }),
  setLeafResult: (result) => set({ leafResult: result }),
  setPestResult: (result) => set({ pestResult: result }),
  setTreatmentResult: (result) => set({ treatmentResult: result }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearAll: () =>
    set({
      voiceResult: null,
      leafResult: null,
      pestResult: null,
      treatmentResult: null,
      error: null,
      sessionId: crypto.randomUUID(),
    }),
}));
