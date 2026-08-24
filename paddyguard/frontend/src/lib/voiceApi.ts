import api from './api'

export interface VoiceDiagnosisResult {
  disease: string
  label_id: number
  confidence: number
  is_ood: boolean
  ood_reason: string | null
  needs_followup: boolean
  status: string
  message: string | null
  all_scores: Record<string, number>
  sinhala_transcript?: string
  english_translation?: string
  session_id: string | null
  followup_question: string | null
  followup_question_en: string | null
  question_number?: number
  max_questions?: number
  followup_complete?: boolean
}

export async function diagnoseVoice(audio: Blob, filename: string): Promise<VoiceDiagnosisResult> {
  const form = new FormData()
  form.append('audio', audio, filename)
  const { data } = await api.post('/api/v1/voice/diagnose', form)
  return data
}

export async function submitFollowUp(answer: string, sessionId: string): Promise<VoiceDiagnosisResult> {
  const { data } = await api.post('/api/v1/voice/followup', { answer, session_id: sessionId })
  return data
}
