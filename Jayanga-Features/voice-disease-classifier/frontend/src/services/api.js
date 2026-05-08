/**
 * PaddyGuard AI — API Service
 * All backend calls go through this module.
 * Change BASE_URL here if your backend port changes.
 */

import axios from 'axios'

const BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,  // 60s — Whisper can take time on first request
})

/**
 * Send audio file to backend for diagnosis.
 * @param {File|Blob} audioFile - recorded or uploaded audio
 * @returns {Promise<DiagnosisResult>}
 */
export async function diagnose(audioFile) {
  const formData = new FormData()
  formData.append('audio', audioFile)

  const response = await api.post('/diagnose', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  return response.data
}

/**
 * Check if backend is ready.
 * @returns {Promise<HealthStatus>}
 */
export async function checkHealth() {
  const response = await api.get('/health')
  return response.data
}
