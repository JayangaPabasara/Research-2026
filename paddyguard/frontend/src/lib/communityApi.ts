import api from './api'

export type Language = 'si' | 'en'
export type Category = 'VOICE' | 'LEAF' | 'PEST' | 'TREATMENT' | 'GENERAL'
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNPUBLISHED'
export const categories: Category[] = ['VOICE', 'LEAF', 'PEST', 'TREATMENT', 'GENERAL']
export const statuses: ModerationStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'UNPUBLISHED']
export const events = ['LOGIN', 'PROFILE_UPDATED', 'AVATAR_UPDATED', 'AVATAR_DELETED', 'FEEDBACK_SUBMITTED', 'VOICE_DIAGNOSIS_COMPLETED', 'VOICE_FOLLOWUP_COMPLETED', 'LEAF_DIAGNOSIS_COMPLETED', 'PEST_DIAGNOSIS_COMPLETED', 'TREATMENT_INTERACTION', 'FEEDBACK_MODERATED', 'FEEDBACK_DELETED'] as const
export type EventType = typeof events[number]
export const modules = ['AUTH', 'PROFILE', 'FEEDBACK', 'VOICE', 'LEAF', 'PEST', 'TREATMENT', 'ADMIN'] as const
export type Module = typeof modules[number]
export interface Profile {
  id: string; email: string; full_name: string | null; phone: string | null
  district: string | null; preferred_language: Language; role: string
  created_at: string; is_active: boolean; avatar_url: string
}
export type ProfileUpdate = Partial<Pick<Profile, 'full_name' | 'phone' | 'district' | 'preferred_language'>>
export interface FeedbackInput { rating: number; category: Category; message: string; consent_public: boolean }
export interface FeedbackRecord extends FeedbackInput { id: string; user_id: string; status: ModerationStatus; created_at: string; updated_at: string; moderated_by: string | null }
export interface Testimonial { id: string; rating: number; category: Category; message: string; created_at: string; display_label: 'Anonymous farmer' }
export interface Activity { id: string; user_id: string; event_type: EventType; module: Module; status: 'SUCCESS'; timestamp: string; request_id: string; metadata: Record<string, unknown> }
export interface Page<T> { items: T[]; total: number; offset: number; limit: number }
export interface Overview { farmers: number; active_farmers: number; feedback: number; pending_feedback: number; testimonials: number; activity_events: number }
export interface Pagination { offset?: number; limit?: number }
export interface ActivityFilters extends Pagination { event_type?: EventType; module?: Module; since?: string; until?: string; user_id?: string }
export interface FeedbackFilters extends Pagination { status?: ModerationStatus; category?: Category; rating?: number; user_id?: string }
export async function readProfile(signal?: AbortSignal) { return (await api.get<Profile>('/api/v1/users/me', { signal })).data }
export async function updateProfile(body: ProfileUpdate) { return (await api.patch<Profile>('/api/v1/users/me', body)).data }
export async function readAvatar(signal?: AbortSignal): Promise<Blob | null> {
  const result = await api.get<Blob>('/api/v1/users/me/avatar', { responseType: 'blob', signal, validateStatus: s => s === 404 || s >= 200 && s < 300 })
  return result.status === 404 ? null : result.data
}
export async function uploadAvatar(file: File) { const body = new FormData(); body.append('avatar', file); await api.post('/api/v1/users/me/avatar', body) }
export async function removeAvatar() { await api.delete('/api/v1/users/me/avatar') }
export async function submitFeedback(body: FeedbackInput) { return (await api.post<FeedbackRecord>('/api/v1/feedback', body)).data }
export async function ownFeedback(params: Pagination, signal?: AbortSignal) { return (await api.get<Page<FeedbackRecord>>('/api/v1/feedback/mine', { params, signal })).data }
export async function testimonials(params: Pagination, signal?: AbortSignal) { return (await api.get<Page<Testimonial>>('/api/v1/testimonials', { params, signal })).data }
export async function activity(params: ActivityFilters, admin = false, signal?: AbortSignal) { return (await api.get<Page<Activity>>(admin ? '/api/v1/admin/activity' : '/api/v1/activity/me', { params, signal })).data }
export async function overview(signal?: AbortSignal) { return (await api.get<Overview>('/api/v1/admin/overview', { signal })).data }
export async function farmers(params: Pagination & { search?: string }, signal?: AbortSignal) { return (await api.get<Page<Profile>>('/api/v1/admin/farmers', { params, signal })).data }
export async function farmer(id: string, signal?: AbortSignal) { return (await api.get<Profile>(`/api/v1/admin/farmers/${encodeURIComponent(id)}`, { signal })).data }
export async function adminFeedback(params: FeedbackFilters, signal?: AbortSignal) { return (await api.get<Page<FeedbackRecord>>('/api/v1/admin/feedback', { params, signal })).data }
export async function moderate(id: string, status: ModerationStatus) { return (await api.patch<FeedbackRecord>(`/api/v1/admin/feedback/${encodeURIComponent(id)}`, { status })).data }
export async function deleteFeedback(id: string) { await api.delete(`/api/v1/admin/feedback/${encodeURIComponent(id)}`, { params: { confirm: id } }) }
export function transitions(item: FeedbackRecord): ModerationStatus[] {
  const allowed: Record<ModerationStatus, ModerationStatus[]> = { PENDING: ['APPROVED', 'REJECTED'], APPROVED: ['UNPUBLISHED', 'REJECTED'], REJECTED: ['PENDING'], UNPUBLISHED: ['APPROVED', 'REJECTED'] }
  return allowed[item.status].filter(s => s !== 'APPROVED' || item.rating >= 4 && item.consent_public)
}
