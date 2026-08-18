import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000,
});

// Types
export interface DiagnosisResult {
  disease: string;
  label_id: number;
  confidence: number;
  is_ood: boolean;
  needs_followup: boolean;
  ood_reason: string | null;
  status: string;
  message: string | null;
  all_scores: Record<string, number>;
  sinhala_transcript?: string;
  english_translation?: string;
}

export interface LeafResult {
  disease: string;
  confidence: number;
  is_ood: boolean;
  gradcam_url: string | null;
  all_scores: Record<string, number>;
}

export interface PestResult {
  pest: string;
  confidence: number;
  is_ood: boolean;
  all_scores: Record<string, number>;
}

export interface TreatmentResult {
  recommendation: string;
  pesticide_dosage: string;
  preventive_measures: string[];
  biological_control: string[];
}

export interface OODResult {
  is_ood: true;
  reason: string;
  message: string;
}

// Voice NLP service
export const voiceService = {
  diagnose: async (audioBlob: Blob): Promise<DiagnosisResult> => {
    const form = new FormData();
    form.append("audio", audioBlob, "recording.ogg");
    const { data } = await api.post("/api/v1/voice/diagnose", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  followup: async (answer: string, sessionId: string): Promise<DiagnosisResult> => {
    const { data } = await api.post("/api/v1/voice/followup", {
      answer,
      session_id: sessionId,
    });
    return data;
  },
};

// Leaf disease service
export const imageService = {
  classifyLeaf: async (imageFile: File): Promise<LeafResult> => {
    const form = new FormData();
    form.append("image", imageFile);
    const { data } = await api.post("/api/v1/image/classify", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  detectPest: async (imageFile: File): Promise<PestResult> => {
    const form = new FormData();
    form.append("image", imageFile);
    const { data } = await api.post("/api/v1/pest/detect", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

// Treatment chatbot service
export const chatService = {
  sendMessage: async (
    message: string,
    sessionId: string
  ): Promise<TreatmentResult> => {
    const { data } = await api.post("/api/v1/chat/message", {
      message,
      session_id: sessionId,
    });
    return data;
  },
};

export default api;
