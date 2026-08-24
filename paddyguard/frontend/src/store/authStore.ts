import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const STORAGE_KEY = "paddyguard_auth";

interface PersistedAuth {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const loadPersisted = (): PersistedAuth => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
};

const persist = (state: PersistedAuth) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const initial = loadPersisted();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial.user,
  accessToken: initial.accessToken,
  refreshToken: initial.refreshToken,
  isAuthenticated: Boolean(initial.accessToken),
  setAuth: (user, accessToken, refreshToken) => {
    persist({ user, accessToken, refreshToken });
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },
  setTokens: (accessToken, refreshToken) => {
    const { user } = get();
    persist({ user, accessToken, refreshToken });
    set({ accessToken, refreshToken, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
