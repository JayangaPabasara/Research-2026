import i18n from '@/i18n'
import { findTaxonomyTopic, resolveTaxonomyToSinhala } from './taxonomy'
export interface DiseaseInfo {
  en: string
  si: string
  color: string
}

const DISEASE_TABLE: Record<string, DiseaseInfo> = {
  'bacterial blight': { en: 'Bacterial Blight', si: 'බැක්ටීරියා අංගමාරය', color: '#E74C3C' },
  'leaf blast': { en: 'Leaf Blast', si: 'කොල පාළු රෝගය', color: '#F4991A' },
  'brown spot': { en: 'Brown Spot', si: 'දුඹුරු පුල්ලි රෝගය', color: '#8B4513' },
  healthy: { en: 'Healthy', si: 'නීරෝගී', color: '#27AE60' },
  'brown planthopper': { en: 'Brown Planthopper', si: 'දුඹුරු මකුණා', color: '#D97706' },
  'rice gall midge': { en: 'Rice Gall Midge', si: 'ගොයම් මකුණා', color: '#4B5563' },
  'rice leaf folder': { en: 'Rice Leaf Folder', si: 'කොළ නවන පණුවා', color: '#059669' },
  'rice hispa': { en: 'Rice Hispa', si: 'හිස්පා පණුවා', color: '#DC2626' },
  'rice stem borer': { en: 'Rice Stem Borer', si: 'කඳ පණුවා', color: '#EA580C' },
}

/** Backend disease names arrive as either "Bacterial_Blight" or "Bacterial Blight" — normalize both. */
function normalize(name: string): string {
  return name.replace(/_/g, ' ').trim().toLowerCase()
}

export function getDiseaseInfo(name: string | null | undefined): DiseaseInfo {
  if (!name) return { en: 'Unknown', si: 'නොදන්නා', color: '#64748B' }
  const key = normalize(name)
  const existing = DISEASE_TABLE[key]
  if (existing) return existing
  const topic = findTaxonomyTopic(name)
  const aliasColor = topic && DISEASE_TABLE[topic.canonical === 'bacterial leaf blight' ? 'bacterial blight' : topic.canonical]?.color
  return { en: topic?.english || name, si: resolveTaxonomyToSinhala(name), color: aliasColor || '#64748B' }
}

export function isHealthyDisease(name: string | null | undefined): boolean {
  return Boolean(name && normalize(name) === 'healthy')
}

export function formatInitialAdvisorMessage(topic: string, lang: 'si' | 'en' = 'si', isPest = false): string {
  const cleanName = topic.replace(/_/g, ' ').trim()
  if (lang === 'si') {
    const sinhalaName = resolveTaxonomyToSinhala(topic)
    // Keep the canonical topic recognizable by the existing backend scope/retrieval
    // even when its Sinhala keyword differs from the teammate's agricultural term.
    const reference = findTaxonomyTopic(topic)
    const topicName = reference && sinhalaName !== cleanName ? `${sinhalaName} (${reference.english})` : sinhalaName
    return `මගේ වී වගාවේ ${topicName} ${isPest ? 'ඉන්නවා' : 'තියෙනවා'}. ඒ සඳහා ප්‍රතිකාර සහ කළමනාකරණ ක්‍රම මොනවාද?`
  }
  return isPest
    ? `My rice plant has been detected with ${cleanName}. What treatment and management methods do you recommend?`
    : `What treatment is recommended for ${cleanName} in rice?`
}

export function diseaseColor(name: string | null | undefined): string {
  return getDiseaseInfo(name).color
}

export function diseaseSinhalaName(name: string | null | undefined): string {
  const info = getDiseaseInfo(name)
  return i18n.language === 'en' ? info.en : info.si
}

export function severityLabel(percentage: number | null | undefined): { label: string; color: string } {
  if (percentage == null) return { label: 'N/A', color: '#64748B' }
  if (percentage < 10) return { label: 'Low', color: '#27AE60' }
  if (percentage < 30) return { label: 'Moderate', color: '#F4991A' }
  return { label: 'Severe', color: '#E74C3C' }
}

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString(i18n.language === 'en' ? 'en-LK' : 'si-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
