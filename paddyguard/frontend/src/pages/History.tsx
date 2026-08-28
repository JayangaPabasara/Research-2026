import { useEffect, useState } from 'react'
import { Mic, Leaf, Bug, Search, Trash2, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { useDiagnosisStore } from '@/store/diagnosisStore'
import { getUserHistory } from '@/lib/leafApi'
import type { CaseSummary } from '@/lib/leafApi'
import { diseaseSinhalaName, formatConfidence, formatDate } from '@/lib/disease'

type Tab = 'voice' | 'leaf' | 'pest'

export default function History() {
  const [tab, setTab] = useState<Tab>('voice')
  const [search, setSearch] = useState('')
  const [leafCases, setLeafCases] = useState<CaseSummary[]>([])
  const [loadingLeaf, setLoadingLeaf] = useState(false)
  const [confirmClear, setConfirmClear] = useState<Tab | null>(null)

  const user = useAuthStore((s) => s.user)
  const {
    voiceHistory, pestHistory,
    deleteVoiceEntry, deletePestEntry,
    clearVoiceHistory, clearPestHistory,
  } = useDiagnosisStore()

  const myVoice = voiceHistory.filter((v) => v.userId === user?.id)
  const myPest  = pestHistory.filter((p) => p.userId === user?.id)

  // Search filtering
  const filteredVoice = myVoice.filter((v) =>
    v.disease.toLowerCase().includes(search.toLowerCase()) ||
    diseaseSinhalaName(v.disease).includes(search)
  )
  const filteredPest = myPest.filter((p) =>
    p.pest_name.replace(/_/g, ' ').toLowerCase().includes(search.toLowerCase())
  )
  const filteredLeaf = leafCases.filter((c) =>
    c.predicted_disease.toLowerCase().includes(search.toLowerCase()) ||
    diseaseSinhalaName(c.predicted_disease).includes(search)
  )

  useEffect(() => {
    if (tab === 'leaf' && leafCases.length === 0) {
      setLoadingLeaf(true)
      getUserHistory()
        .then(setLeafCases)
        .catch(() => setLeafCases([]))
        .finally(() => setLoadingLeaf(false))
    }
    setSearch('') // clear search when switching tabs
  }, [tab])

  function handleClearAll() {
    if (!user) return
    if (confirmClear === 'voice') clearVoiceHistory(user.id)
    if (confirmClear === 'pest') clearPestHistory(user.id)
    if (confirmClear === 'leaf') setLeafCases([]) // leaf is server-side, just clear local
    setConfirmClear(null)
  }

  const currentCount =
    tab === 'voice' ? myVoice.length :
    tab === 'pest' ? myPest.length :
    leafCases.length

  return (
    <div className="space-y-4">

      {/* Tab bar with counts */}
      <div className="flex gap-2 rounded-xl bg-beige p-1">
        {([
          { key: 'voice' as Tab, label: 'Voice', icon: Mic, count: myVoice.length },
          { key: 'leaf' as Tab, label: 'Leaf', icon: Leaf, count: leafCases.length },
          { key: 'pest' as Tab, label: 'Pest', icon: Bug, count: myPest.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm
              font-semibold transition-colors
              ${tab === t.key ? 'bg-white text-forest shadow-sm' : 'text-forest-muted'}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs
                ${tab === t.key ? 'bg-amber text-white' : 'bg-beige text-forest-muted'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="රෝගය සොයන්න | Search disease..."
          className="w-full rounded-xl border border-beige bg-white py-2.5 pl-9 pr-4
            text-sm text-forest placeholder-forest-muted outline-none
            focus:border-forest focus:ring-1 focus:ring-forest"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-muted hover:text-forest"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Clear all button — only show if entries exist and tab is not leaf */}
      {currentCount > 0 && tab !== 'leaf' && (
        confirmClear === tab ? (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3">
            <span className="flex-1 text-sm text-red-600 font-sinhala">
              ඉතිහාසය මකන්නද? | Clear all {tab} history?
            </span>
            <button
              onClick={handleClearAll}
              className="rounded-lg bg-red-soft px-3 py-1.5 text-xs font-bold text-white"
            >
              ඔව් | Yes
            </button>
            <button
              onClick={() => setConfirmClear(null)}
              className="rounded-lg bg-beige px-3 py-1.5 text-xs font-semibold text-forest"
            >
              නෑ | No
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setConfirmClear(tab)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs
                font-semibold text-red-soft hover:bg-red-50 transition-colors"
              title="Clear all history for this tab"
            >
              <Trash2 className="h-3.5 w-3.5" />
              සියල්ල මකන්න | Clear All
            </button>
          </div>
        )
      )}

      {/* Voice tab */}
      {tab === 'voice' && (
        filteredVoice.length === 0 ? (
          <EmptyState icon={Mic}
            title={search ? 'No results found' : 'No voice diagnoses yet'} />
        ) : (
          <div className="space-y-3">
            {filteredVoice.map((v) => (
              <Card key={v.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-sinhala font-medium text-forest">
                    {diseaseSinhalaName(v.disease)}
                  </p>
                  <p className="text-xs text-forest-muted">{formatDate(v.timestamp)}</p>
                </div>
                <span className="text-sm font-semibold text-forest-muted">
                  {formatConfidence(v.confidence)}
                </span>
                <button
                  onClick={() => deleteVoiceEntry(v.id)}
                  className="ml-1 rounded-lg p-1.5 text-forest-muted
                    hover:bg-red-50 hover:text-red-soft transition-colors"
                  title="Delete this entry | මෙම වාර්තාව මකන්න"
                  aria-label="Delete voice diagnosis entry"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Leaf tab */}
      {tab === 'leaf' && (
        loadingLeaf ? (
          <LoadingSpinner labelEn="Loading leaf history..." />
        ) : filteredLeaf.length === 0 ? (
          <EmptyState icon={Leaf}
            title={search ? 'No results found' : 'No leaf analyses yet'} />
        ) : (
          <div className="space-y-3">
            {filteredLeaf.map((c) => (
              <Card key={c.case_id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-sinhala font-medium text-forest">
                    {diseaseSinhalaName(c.predicted_disease)}
                  </p>
                  <p className="text-xs text-forest-muted">{formatDate(c.created_at)}</p>
                </div>
                <span className="text-sm font-semibold text-forest-muted">
                  {formatConfidence(c.confidence)}
                </span>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Pest tab */}
      {tab === 'pest' && (
        filteredPest.length === 0 ? (
          <EmptyState icon={Bug}
            title={search ? 'No results found' : 'No pest detections yet'} />
        ) : (
          <div className="space-y-3">
            {filteredPest.map((p) => (
              <Card key={p.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-forest">
                    {p.pest_name.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-forest-muted">{formatDate(p.timestamp)}</p>
                </div>
                <span className="text-sm font-semibold text-forest-muted">
                  {formatConfidence(p.confidence)}
                </span>
                <button
                  onClick={() => deletePestEntry(p.id)}
                  className="ml-1 rounded-lg p-1.5 text-forest-muted
                    hover:bg-red-50 hover:text-red-soft transition-colors"
                  title="Delete this entry | මෙම වාර්තාව මකන්න"
                  aria-label="Delete pest detection entry"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
