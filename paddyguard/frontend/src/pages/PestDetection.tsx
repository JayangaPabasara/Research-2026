import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PestResult from '@/components/pest/PestResult'
import { detectPest } from '@/lib/pestApi'
import type { PestDetectionResult } from '@/lib/pestApi'
import { useAuthStore } from '@/store/authStore'
import { useDiagnosisStore } from '@/store/diagnosisStore'
import { formatConfidence, formatDate } from '@/lib/disease'

type Tab = 'detect' | 'history'

export default function PestDetection() {
  const [tab, setTab] = useState<Tab>('detect')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [result, setResult] = useState<PestDetectionResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const user = useAuthStore((s) => s.user)
  const { pestHistory, addPestEntry } = useDiagnosisStore()
  const myHistory = pestHistory.filter((p) => p.userId === user?.id)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setResult(null)
    e.target.value = ''
  }

  function clearFile() {
    setFile(null)
    setPreview(null)
    setResult(null)
  }

  async function handleDetect() {
    if (!file) {
      toast.error('Please select an image')
      return
    }
    setDetecting(true)
    try {
      const data = await detectPest(file)
      setResult(data)
      if (user) {
        addPestEntry({
          pest_name: data.prediction,
          confidence: data.confidence,
          is_ood: data.status === 'unknown',
          userId: user.id,
        })
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Detection failed. Please try again.'
      toast.error(message)
    } finally {
      setDetecting(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setResult(null)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex gap-2 rounded-xl bg-beige p-1">
        {(['detect', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-white text-forest shadow-sm' : 'text-forest-muted'
            }`}
          >
            {t === 'detect' ? 'Detect' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'detect' && (
        <>
          {!result && (
            <Card>
              {!preview ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-beige bg-beige/40 hover:border-amber"
                >
                  <ImagePlus className="h-8 w-8 text-amber" />
                  <span className="text-sm text-forest-muted">Click to select a pest photo</span>
                </button>
              ) : (
                <div className="relative">
                  <img src={preview} alt="Pest preview" className="h-[200px] w-full rounded-xl object-cover" />
                  <button
                    onClick={clearFile}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-forest shadow"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              <Button size="lg" className="mt-5 w-full font-sinhala" onClick={handleDetect} loading={detecting}>
                හඳුනාගන්න | Detect Pest
              </Button>
            </Card>
          )}

          {result && (
            <div className="space-y-4">
              <PestResult result={result} />
              <Button variant="outline" className="w-full font-sinhala" onClick={reset}>
                නැවත | New Detection
              </Button>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {myHistory.length === 0 ? (
            <EmptyState title="No pest detections yet" description="Detected pests will appear here." />
          ) : (
            <div className="space-y-3">
              {myHistory.map((h) => (
                <Card key={h.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-forest">{h.pest_name.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-forest-muted">{formatDate(h.timestamp)}</p>
                  </div>
                  <span className="text-sm font-semibold text-forest-muted">{formatConfidence(h.confidence)}</span>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
