import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ImagePlus, X, MapPin, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ResultCard from '@/components/leaf/ResultCard'
import HistoryTable from '@/components/leaf/HistoryTable'
import ActivityModal from '@/components/leaf/ActivityModal'
import { analyzeLeaf, deleteCase, getCases, getUserHistory } from '@/lib/leafApi'
import type { AnalyzeResult, CaseSummary } from '@/lib/leafApi'
import { useAuthStore } from '@/store/authStore'
import { getLeafAuth } from '@/lib/leafApi'

type Tab = 'analyze' | 'history'

export default function LeafDisease() {
  const [tab, setTab] = useState<Tab>('analyze')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [showLocation, setShowLocation] = useState(false)
  const [city, setCity] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [fieldArea, setFieldArea] = useState('1')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzeResult | null>(null)

  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedCase, setSelectedCase] = useState<CaseSummary | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore((s) => s.user)
  const leafAuth = getLeafAuth()
  const isStaff = leafAuth?.role === 'EXPERT' || leafAuth?.role === 'SUPER_ADMIN'

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab])

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const data = isStaff ? await getCases(leafAuth?.username) : await getUserHistory()
      setCases(data)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoadingHistory(false)
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    e.target.value = ''
  }

  function clearFile() {
    setFile(null)
    setPreview(null)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude))
        setLongitude(String(pos.coords.longitude))
        toast.success('Location captured')
      },
      () => toast.error('Could not get location')
    )
  }

  async function handleAnalyze() {
    if (!file) {
      toast.error('Please select a leaf image')
      return
    }
    if (!city && !(latitude && longitude)) {
      toast.error('Provide a city or GPS coordinates')
      return
    }
    setAnalyzing(true)
    setResult(null)
    try {
      const data = await analyzeLeaf({
        file,
        city: city || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        field_area_acres: Number(fieldArea) || 1,
        created_by: leafAuth?.username || user?.email,
      })
      setResult(data)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Analysis failed. Please try again.'
      toast.error(message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleDelete(caseId: string) {
    await deleteCase(caseId)
    setCases((prev) => prev.filter((c) => c.case_id !== caseId))
    toast.success('Case deleted')
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-xl bg-beige p-1">
        {(['analyze', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-white text-forest shadow-sm' : 'text-forest-muted'
            }`}
          >
            {t === 'analyze' ? 'Analyze' : 'My History'}
          </button>
        ))}
      </div>

      {tab === 'analyze' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            {!preview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-beige bg-beige/40 hover:border-amber"
              >
                <ImagePlus className="h-8 w-8 text-amber" />
                <span className="text-sm text-forest-muted">Click to select a leaf image</span>
              </button>
            ) : (
              <div className="relative">
                <img src={preview} alt="Leaf preview" className="h-[200px] w-full rounded-xl object-cover" />
                <button
                  onClick={clearFile}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-forest shadow"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <button
              onClick={() => setShowLocation((s) => !s)}
              className="mt-4 flex items-center gap-1.5 text-sm font-medium text-forest"
            >
              <MapPin className="h-4 w-4" />
              Location &amp; Field Details {showLocation ? '−' : '+'}
            </button>

            {showLocation && (
              <div className="mt-3 space-y-3">
                <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Anuradhapura" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                  <Input label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                </div>
                <Input
                  label="Field Area (acres)"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={fieldArea}
                  onChange={(e) => setFieldArea(e.target.value)}
                />
                <Button variant="ghost" size="sm" onClick={useMyLocation}>
                  <MapPin className="h-4 w-4" /> Use my location
                </Button>
              </div>
            )}

            <Button size="lg" className="mt-5 w-full font-sinhala" onClick={handleAnalyze} loading={analyzing}>
              විශ්ලේෂණය කරන්න | Analyze Leaf
            </Button>
          </Card>

          <div>
            {analyzing && (
              <Card className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 className="h-10 w-10 animate-spin text-forest" />
                <p className="text-sm text-forest-muted">Running EfficientNet-B3 classification…</p>
              </Card>
            )}
            {!analyzing && result && <ResultCard result={result} />}
            {!analyzing && !result && (
              <Card className="flex min-h-[200px] items-center justify-center text-center text-sm text-forest-muted">
                Analysis results will appear here.
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <>
          {loadingHistory ? (
            <LoadingSpinner labelEn="Loading history..." />
          ) : (
            <HistoryTable cases={cases} onRowClick={setSelectedCase} onDelete={handleDelete} />
          )}
          <ActivityModal caseData={selectedCase} onClose={() => setSelectedCase(null)} />
        </>
      )}
    </div>
  )
}
