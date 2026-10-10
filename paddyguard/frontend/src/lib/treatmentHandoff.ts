import { formatInitialAdvisorMessage, isHealthyDisease } from './disease'
import type { PestDetectionResult } from './pestApi'

export interface TreatmentHandoff {
  source: 'detection'
  detectionType: 'pest' | 'disease'
  initialTopic: string
  initialMessage: string
  handoffId: string
}

export function canTreatLeaf(prediction: string, status: string): boolean {
  return Boolean(prediction.trim()) && !isHealthyDisease(prediction) && !/ood|unknown|invalid|error|rejected/i.test(`${status} ${prediction}`)
}

export function canTreatPest(result: PestDetectionResult): boolean {
  return result.quality.passed && result.status !== 'unknown' && result.source !== 'quality_check' && result.source !== 'ood' && Boolean(result.prediction.trim()) && !/unknown|invalid|quality too low/i.test(result.prediction)
}

export function createTreatmentHandoff(topic: string, detectionType: 'pest' | 'disease'): TreatmentHandoff {
  return { source: 'detection', detectionType, initialTopic: topic,
    initialMessage: formatInitialAdvisorMessage(topic, 'si', detectionType === 'pest'), handoffId: crypto.randomUUID() }
}
