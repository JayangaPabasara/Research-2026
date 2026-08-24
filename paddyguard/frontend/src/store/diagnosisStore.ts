import { create } from 'zustand'
import type { AnalyzeResult } from '@/lib/leafApi'

export interface VoiceHistoryEntry {
  id: string
  timestamp: string
  disease: string
  confidence: number
  is_ood: boolean
  sinhala_transcript: string
  english_translation: string
  all_scores: Record<string, number>
  userId: string
}

export interface PestHistoryEntry {
  id: string
  timestamp: string
  pest_name: string
  confidence: number
  is_ood: boolean
  userId: string
}

const HISTORY_KEY = 'paddyguard_diagnosis_history'
const MAX_ENTRIES = 50

interface StoredHistory {
  voiceHistory: VoiceHistoryEntry[]
  pestHistory: PestHistoryEntry[]
}

function loadHistory(): StoredHistory {
  const raw = localStorage.getItem(HISTORY_KEY)
  if (!raw) return { voiceHistory: [], pestHistory: [] }
  try {
    const parsed = JSON.parse(raw)
    return { voiceHistory: parsed.voiceHistory ?? [], pestHistory: parsed.pestHistory ?? [] }
  } catch {
    return { voiceHistory: [], pestHistory: [] }
  }
}

function persist(voiceHistory: VoiceHistoryEntry[], pestHistory: PestHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify({ voiceHistory, pestHistory }))
}

interface DiagnosisState {
  voiceHistory: VoiceHistoryEntry[]
  pestHistory: PestHistoryEntry[]
  leafResult: AnalyzeResult | null
  addVoiceEntry: (entry: Omit<VoiceHistoryEntry, 'id' | 'timestamp'>) => void
  addPestEntry: (entry: Omit<PestHistoryEntry, 'id' | 'timestamp'>) => void
  setLeafResult: (result: AnalyzeResult | null) => void
  historyForUser: (userId: string) => { voice: VoiceHistoryEntry[]; pest: PestHistoryEntry[] }
}

export const useDiagnosisStore = create<DiagnosisState>((set, get) => ({
  ...loadHistory(),
  leafResult: null,
  addVoiceEntry: (entry) => {
    const full: VoiceHistoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() }
    const voiceHistory = [full, ...get().voiceHistory].slice(0, MAX_ENTRIES)
    persist(voiceHistory, get().pestHistory)
    set({ voiceHistory })
  },
  addPestEntry: (entry) => {
    const full: PestHistoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() }
    const pestHistory = [full, ...get().pestHistory].slice(0, MAX_ENTRIES)
    persist(get().voiceHistory, pestHistory)
    set({ pestHistory })
  },
  setLeafResult: (result) => set({ leafResult: result }),
  historyForUser: (userId) => ({
    voice: get().voiceHistory.filter((e) => e.userId === userId),
    pest: get().pestHistory.filter((e) => e.userId === userId),
  }),
}))
