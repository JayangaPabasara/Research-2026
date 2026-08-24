import api from './api'

export interface PestQuality {
  passed: boolean
  warnings: string[]
  blur_score: number
  brightness: number
  contrast: number
  edge_density: number
  resolution: string
}

export interface PestDetectionResult {
  prediction: string
  confidence: number
  status: 'known' | 'maybe' | 'unknown'
  source: 'base_model' | 'few_shot' | 'fine_tuned' | 'quality_check' | 'ood'
  quality: PestQuality
  gradcam_image_base64: string | null
  message: string
  few_shot_similarity: number | null
  ood_score: number | null
  ood_method: string
}

export async function detectPest(image: File): Promise<PestDetectionResult> {
  const form = new FormData()
  form.append('image', image)
  const { data } = await api.post('/api/v1/pest/detect', form)
  return data
}
