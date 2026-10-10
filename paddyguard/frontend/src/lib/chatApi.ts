import api from './api'
import { LOCAL_TAXONOMY, type TaxonomyTopic } from './taxonomy'
export { resolveTaxonomyToSinhala, type TaxonomyTopic } from './taxonomy'

/** No backend taxonomy metadata contract is currently exposed. */
export const CHAT_TAXONOMY_METADATA = { source: 'local', backendMetadataAvailable: false } as const
export async function getChatTaxonomy(): Promise<TaxonomyTopic[]> {
  return LOCAL_TAXONOMY.map(topic => ({ ...topic, aliases: [...topic.aliases] }))
}

export interface ChemicalEntry {
  name: string
  dose_per_liter_water: string
  coverage_per_liter_mixture_acres: string
  coverage_per_liter_mixture_hectares: string
}

export interface ChatMessageResponse {
  session_id: string
  reply: string
  language: 'en' | 'si'
  in_scope: boolean
  chemicals: ChemicalEntry[]
  follow_up_question: string | null
  sources?: string[]
}

/** POST /api/v1/chat/message — send one turn of the conversation. */
export async function sendChatMessage(message: string, sessionId: string, signal?: AbortSignal): Promise<ChatMessageResponse> {
  const { data } = await api.post<ChatMessageResponse>('/api/v1/chat/message', {
    message,
    session_id: sessionId,
  }, { signal })
  return data
}

/** GET /api/v1/chat/topics — the rice diseases/pests this chatbot is scoped to. */
export async function getChatTopics(): Promise<string[]> {
  const { data } = await api.get<{ topics: string[] }>('/api/v1/chat/topics')
  return data.topics
}

/** DELETE /api/v1/chat/session/:sessionId — clear server-side conversation memory for a session. */
export async function clearChatSession(sessionId: string): Promise<void> {
  await api.delete(`/api/v1/chat/session/${sessionId}`)
}
