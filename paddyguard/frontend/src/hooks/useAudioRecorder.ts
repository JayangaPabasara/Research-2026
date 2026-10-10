import { useCallback, useEffect, useRef, useState } from 'react'
import { uiText } from '@/i18n/text'

interface UseAudioRecorderResult {
  isRecording: boolean
  seconds: number
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<{ blob: Blob; filename: string } | null>
  cancel: () => void
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generationRef = useRef(0)
  const resolveStopRef = useRef<((value: { blob: Blob; filename: string } | null) => void) | null>(null)

  const cancel = useCallback(() => {
    generationRef.current++
    const recorder = mediaRecorderRef.current
    if (recorder) {
      recorder.ondataavailable = null
      recorder.onstop = null
      if (recorder.state !== 'inactive') recorder.stop()
    }
    resolveStopRef.current?.(null)
    resolveStopRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current = null
    chunksRef.current = []
    setIsRecording(false)
    setSeconds(0)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      cancel()
    }
  }, [cancel])

  const start = useCallback(async () => {
    const generation = ++generationRef.current
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (generation !== generationRef.current) { stream.getTracks().forEach(track => track.stop()); return }
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorderRef.current = recorder
      recorder.start()

      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      setIsRecording(true)
    } catch {
      if (generation !== generationRef.current) return
      setError(uiText('Microphone permission denied.'))
    }
  }, [])

  const stop = useCallback((): Promise<{ blob: Blob; filename: string } | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        setIsRecording(false)
        resolveStopRef.current = null
        resolve({ blob, filename: `recording.${blob.type.includes('webm') ? 'webm' : 'ogg'}` })
      }
      resolveStopRef.current = resolve
      recorder.stop()
    })
  }, [])

  return { isRecording, seconds, error, start, stop, cancel }
}
