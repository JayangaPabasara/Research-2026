/**
 * PaddyGuard AI — useAudioRecorder hook
 * Handles all microphone recording logic.
 * Components stay clean — they just call start/stop.
 */

import { useState, useRef, useCallback } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording]   = useState(false)
  const [audioBlob,   setAudioBlob]     = useState(null)
  const [audioURL,    setAudioURL]      = useState(null)
  const [duration,    setDuration]      = useState(0)
  const [error,       setError]         = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const timerRef         = useRef(null)

  const startRecording = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    setAudioURL(null)
    setDuration(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm;codecs=opus'
      })

      chunksRef.current        = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob    = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        const url     = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioURL(url)
        // Stop all tracks to release microphone
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start(100)  // collect data every 100ms
      setIsRecording(true)

      // Update duration counter
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.')
      } else {
        setError(`Could not start recording: ${err.message}`)
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }, [isRecording])

  const reset = useCallback(() => {
    setAudioBlob(null)
    setAudioURL(null)
    setDuration(0)
    setError(null)
    if (audioURL) URL.revokeObjectURL(audioURL)
  }, [audioURL])

  return {
    isRecording,
    audioBlob,
    audioURL,
    duration,
    error,
    startRecording,
    stopRecording,
    reset
  }
}
