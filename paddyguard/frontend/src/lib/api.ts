import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// FastAPI returns `detail` as a string for HTTPException, but as an array of
// {msg, loc, ...} objects for 422 pydantic validation errors — rendering that
// array directly in JSX crashes React ("Objects are not valid as a React child").
export function getErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'string' ? d : d?.msg)).filter(Boolean).join(' ') || fallback
  }
  return fallback
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 240000,
})

interface StoredAuth {
  accessToken: string | null
  refreshToken: string | null
}

function readAuth(): StoredAuth | null {
  const raw = localStorage.getItem('paddyguard_auth')
  try { return raw ? (JSON.parse(raw) as StoredAuth) : null } catch { return null }
}

api.interceptors.request.use((config) => {
  const auth = readAuth()
  const target = new URL(config.url || '', config.baseURL || window.location.origin)
  const gateway = new URL(api.defaults.baseURL || window.location.origin, window.location.origin)
  if (auth?.accessToken && target.origin === gateway.origin && !config.url?.includes('/auth/login') && !config.url?.includes('/auth/register')) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  if (config.method === 'post' && /^\/api\/v1\/(voice\/(diagnose|followup)|image\/classify|pest\/detect|chat\/message)$/.test(config.url || '') && !config.headers['X-Request-ID']) config.headers['X-Request-ID'] = crypto.randomUUID()
  return config
})

let refreshPromise: Promise<string> | null = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && original && !original._retry && !/\/auth\/(login|register|refresh)$/.test(original.url || '') && !/^https?:/.test(original.url || '')) {
      original._retry = true
      try {
        const auth = readAuth()
        if (!auth?.refreshToken) throw new Error('no refresh token')

        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${api.defaults.baseURL}/api/v1/auth/refresh`, {
              refresh_token: auth.refreshToken,
            })
            .then(({ data }) => {
              const stored = JSON.parse(localStorage.getItem('paddyguard_auth') || '{}')
              stored.accessToken = data.access_token
              stored.refreshToken = data.refresh_token
              localStorage.setItem('paddyguard_auth', JSON.stringify(stored))
              useAuthStore.setState({ accessToken: data.access_token, refreshToken: data.refresh_token })
              return data.access_token as string
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        const newToken = await refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api
