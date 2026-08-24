import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Mic, Square, UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import DiagnosisResult from '@/components/voice/DiagnosisResult'
import FollowUpDialog from '@/components/voice/FollowUpDialog'
import OODWarning from '@/components/voice/OODWarning'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { diagnoseVoice, submitFollowUp } from '@/lib/voiceApi'
import type { VoiceDiagnosisResult } from '@/lib/voiceApi'
import { useAuthStore } from '@/store/authStore'
import { useDiagnosisStore } from '@/store/diagnosisStore'

type Stage = 'idle' | 'recording' | 'analysing' | 'result' | 'followup' | 'ood'

const EXAMPLES = [
  'කොළ වල දුඹුරු පැහැති පුල්ලි තියෙනවා',
  'කොළ වල කහ පාට වළල්ලක් සහිත තිත් තියෙනවා',
  'ගස මැළවී වියළී යනවා',
]

export default function VoiceDiagnosis() {
  const [stage, setStage] = useState<Stage>('idle')
  const [result, setResult] = useState<VoiceDiagnosisResult | null>(null)
  const [followupLoading, setFollowupLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recorder = useAudioRecorder()
  const user = useAuthStore((s) => s.user)
  const addVoiceEntry = useDiagnosisStore((s) => s.addVoiceEntry)

  function handleResult(data: VoiceDiagnosisResult) {
    setResult(data)
    if (data.is_ood) {
      setStage('ood')
    } else if (data.needs_followup) {
      setStage('followup')
    } else {
      setStage('result')
      if (user) {
        addVoiceEntry({
          disease: data.disease,
          confidence: data.confidence,
          is_ood: data.is_ood,
          sinhala_transcript: data.sinhala_transcript || '',
          english_translation: data.english_translation || '',
          all_scores: data.all_scores,
          userId: user.id,
        })
      }
    }
  }

  async function runDiagnosis(blob: Blob, filename: string) {
    setStage('analysing')
    try {
      const data = await diagnoseVoice(blob, filename)
      handleResult(data)
    } catch {
      toast.error('රෝග විනිශ්චය අසාර්ථක විය | Diagnosis failed')
      setStage('idle')
    }
  }

  async function handleStop() {
    const recording = await recorder.stop()
    if (recording) await runDiagnosis(recording.blob, recording.filename)
    else setStage('idle')
  }

  async function handleStart() {
    setStage('recording')
    await recorder.start()
    if (recorder.error) {
      toast.error(recorder.error)
      setStage('idle')
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) runDiagnosis(file, file.name)
    e.target.value = ''
  }

  async function handleFollowUpAnswer(answer: string) {
    if (!result?.session_id) return
    setFollowupLoading(true)
    try {
      const data = await submitFollowUp(answer, result.session_id)
      handleResult(data)
    } catch {
      toast.error('පිළිතුර යැවීම අසාර්ථක විය | Failed to submit answer')
    } finally {
      setFollowupLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setStage('idle')
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {stage === 'idle' && (
        <>
          <Card className="border-l-4 border-amber bg-beige">
            <div className="flex items-start gap-3">
              <Mic className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
              <div>
                <p className="font-sinhala font-medium text-forest">ගොයම් රෝගයේ ලක්ෂණ ගැන සිංහලෙන් කතා කරන්න</p>
                <p className="text-sm text-forest-muted">Describe your paddy disease symptoms in Sinhala</p>
              </div>
            </div>
          </Card>

          <div className="flex flex-col items-center gap-3 py-4">
            <button
              onClick={handleStart}
              className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-forest bg-white shadow-2xl transition-transform active:scale-95"
            >
              <Mic className="h-12 w-12 text-forest" />
            </button>
            <p className="text-sm text-forest-muted">ස්පර්ශ කරන්න | Tap to record</p>
          </div>

          <div className="flex items-center gap-3 text-forest-muted">
            <div className="h-px flex-1 bg-beige" />
            <span className="text-xs">හෝ | or</span>
            <div className="h-px flex-1 bg-beige" />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-beige bg-beige/40 px-4 py-6 text-center hover:border-amber"
          >
            <UploadCloud className="h-6 w-6 text-amber" />
            <span className="font-sinhala text-sm text-forest">ශ්‍රව්‍ය ගොනුවක් ඇතුළු කරන්න</span>
            <span className="text-xs text-forest-muted">.ogg .mp3 .wav .webm .m4a</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ogg,.mp3,.wav,.webm,.m4a,audio/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <Card>
            <p className="mb-3 text-xs font-semibold uppercase text-forest-muted">Example Symptoms</p>
            <div className="space-y-2">
              {EXAMPLES.map((ex) => (
                <div key={ex} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-soft" />
                  <span className="font-sinhala text-sm text-forest-light">{ex}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {stage === 'recording' && (
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <span className="absolute h-40 w-40 animate-recording-ring rounded-full border-2 border-red-400" />
            <button
              onClick={handleStop}
              className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-red-soft bg-red-50 shadow-2xl"
            >
              <Square className="h-10 w-10 text-red-soft" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-red-soft">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-soft" />
            <span>
              {String(Math.floor(recorder.seconds / 60)).padStart(1, '0')}:
              {String(recorder.seconds % 60).padStart(2, '0')} · පටිගත වෙමින්
            </span>
          </div>

          <div className="flex h-12 items-end gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 animate-pulse rounded-full bg-amber"
                style={{ height: `${20 + ((i * 37) % 60)}%`, animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>

          <Button variant="danger" size="lg" className="w-full" onClick={handleStop}>
            නතර කරන්න | Stop &amp; Analyse
          </Button>
        </div>
      )}

      {stage === 'analysing' && (
        <Card>
          <LoadingSpinner label="විශ්ලේෂණය කරමින්..." labelEn="Analysing your voice recording" />
        </Card>
      )}

      {stage === 'result' && result && <DiagnosisResult result={result} onNewDiagnosis={reset} />}

      {stage === 'followup' && result && (
        <FollowUpDialog
          question={result.followup_question || ''}
          questionEn={result.followup_question_en || ''}
          questionNumber={result.question_number || 1}
          maxQuestions={result.max_questions || 3}
          confidence={result.confidence}
          onAnswer={handleFollowUpAnswer}
          onSkip={reset}
          loading={followupLoading}
        />
      )}

      {stage === 'ood' && result && (
        <OODWarning reason={result.ood_reason} message={result.message} onRetry={reset} />
      )}
    </div>
  )
}
