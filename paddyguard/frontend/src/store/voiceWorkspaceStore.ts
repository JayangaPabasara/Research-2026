import { create } from 'zustand'
import type { VoiceDiagnosisResult } from '@/lib/voiceApi'

export const VOICE_WORKSPACE_KEY = 'paddyguard_voice_workspaces'
const fields = ['disease', 'label_id', 'confidence', 'is_ood', 'ood_reason', 'needs_followup', 'status', 'message', 'all_scores', 'sinhala_transcript', 'english_translation', 'session_id', 'followup_question', 'followup_question_en', 'question_number', 'max_questions', 'followup_complete', 'severity', 'confidence_trajectory', 'audio_quality'] as const

/** Whitelist diagnosis data. Raw recordings, generated audio and credentials are excluded. */
export function serializableVoiceResult(result: VoiceDiagnosisResult): VoiceDiagnosisResult {
  return Object.fromEntries(fields.filter(key => result[key] !== undefined).map(key => [key, result[key]])) as unknown as VoiceDiagnosisResult
}

function load(): Record<string, VoiceDiagnosisResult> {
  if (typeof window === 'undefined') return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(VOICE_WORKSPACE_KEY) || '{}')
    return Object.fromEntries(Object.entries(parsed).filter(([, item]) => {
      const result = item as VoiceDiagnosisResult
      return result && typeof result.disease === 'string' && typeof result.confidence === 'number' && typeof result.all_scores === 'object'
    }).map(([id, item]) => [id, serializableVoiceResult(item as VoiceDiagnosisResult)]))
  } catch { return {} }
}

function persist(workspaces: Record<string, VoiceDiagnosisResult>) {
  try { localStorage.setItem(VOICE_WORKSPACE_KEY, JSON.stringify(workspaces)) } catch { /* Continue in memory when device storage is unavailable. */ }
}

interface VoiceWorkspaceState {
  workspaces: Record<string, VoiceDiagnosisResult>
  saveWorkspace: (userId: string, result: VoiceDiagnosisResult) => void
  clearWorkspace: (userId: string) => void
}

export const useVoiceWorkspaceStore = create<VoiceWorkspaceState>((set, get) => ({
  workspaces: load(),
  saveWorkspace: (userId, result) => {
    const workspaces = { ...get().workspaces, [userId]: serializableVoiceResult(result) }
    persist(workspaces)
    set({ workspaces })
  },
  clearWorkspace: userId => {
    const workspaces = { ...get().workspaces }
    delete workspaces[userId]
    persist(workspaces)
    set({ workspaces })
  },
}))
