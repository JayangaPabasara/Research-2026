import axios from "axios";
import { useAuthStore } from "../store/authStore";

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
  sinhala_transcript: string;
  english_translation: string;
  session_id: string | null;
  followup_question: string | null;
  followup_question_en: string | null;
  question_number: number;
  max_questions: number;
  followup_complete?: boolean;
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

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// --- Auth interceptor: attach JWT to every request ---
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// --- 401 handling: refresh once then retry, otherwise log out ---
let refreshPromise: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<AuthTokens>(
      `${api.defaults.baseURL}/api/v1/auth/refresh`,
      { refresh_token: refreshToken }
    );
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      refreshPromise = refreshPromise ?? performRefresh();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth service
export const authApi = {
  register: async (
    email: string,
    password: string,
    full_name: string
  ): Promise<AuthTokens> => {
    const { data } = await api.post("/api/v1/auth/register", {
      email,
      password,
      full_name,
    });
    return data;
  },
  login: async (email: string, password: string): Promise<AuthTokens> => {
    const { data } = await api.post("/api/v1/auth/login", { email, password });
    return data;
  },
  refresh: async (refresh_token: string): Promise<AuthTokens> => {
    const { data } = await api.post("/api/v1/auth/refresh", { refresh_token });
    return data;
  },
};

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
