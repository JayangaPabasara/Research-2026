/** Only report expiry when the server explicitly reports it. No replay/probe. */
export function isExpiredChatSession(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown; code?: unknown } } })?.response
  return response?.status === 410 || (response?.status === 404 && /session.*(expired|missing|not found|invalid)/i.test(String(response.data?.detail || ''))) || response?.data?.code === 'SESSION_EXPIRED'
}
