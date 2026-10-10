import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  role: string
  phone?: string | null
  district?: string | null
  preferred_language?: 'si' | 'en'
  created_at?: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  identityVerified: boolean
  updateUser: (user: AuthUser) => void
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
}

const STORAGE_KEY = 'paddyguard_auth'
function storedIdentity(user: AuthUser) { return { id: user.id, email: user.email, full_name: user.full_name, role: user.role } }

function loadInitial(): Pick<AuthState, 'user' | 'accessToken' | 'refreshToken' | 'isAuthenticated'> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { user: null, accessToken: null, refreshToken: null, isAuthenticated: false }
  try {
    const parsed = JSON.parse(raw)
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      isAuthenticated: Boolean(parsed.accessToken),
    }
  } catch {
    return { user: null, accessToken: null, refreshToken: null, isAuthenticated: false }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitial(),
  identityVerified: false,
  updateUser: (user) => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, user: storedIdentity(user) }))
    set({ user, identityVerified: true })
  },
  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: storedIdentity(user), accessToken, refreshToken }))
    set({ user, accessToken, refreshToken, isAuthenticated: true, identityVerified: false })
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('paddyguard_leaf_auth')
    sessionStorage.removeItem('paddyguard_leaf_analysis_state')
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, identityVerified: false })
  },
}))
