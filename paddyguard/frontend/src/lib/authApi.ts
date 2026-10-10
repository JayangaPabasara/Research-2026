import api from './api'
import { readProfile } from './communityApi'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export type { Profile as ProfileResponse } from './communityApi'

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post('/api/v1/auth/login', { email, password })
  return data
}

export async function register(email: string, password: string, fullName?: string): Promise<TokenResponse> {
  const { data } = await api.post('/api/v1/auth/register', { email, password, full_name: fullName || null })
  return data
}

export const getProfile = readProfile
