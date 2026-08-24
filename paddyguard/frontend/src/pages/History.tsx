import { useEffect, useState } from 'react'
import { Mic, Leaf, Bug } from 'lucide-react'
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
  const [leafCases, setLeafCases] = useState<CaseSummary[]>([])
  const [loadingLeaf, setLoadingLeaf] = useState(false)

  const user = useAuthStore((s) => s.user)
  const { voiceHistory, pestHistory } = useDiagnosisStore()
  const myVoice = voiceHistory.filter((v) => v.userId === user?.id)
  const myPest = pestHistory.filter((p) => p.userId === user?.id)

  useEffect(() => {
    if (tab === 'leaf' && leafCases.length === 0) {
      setLoadingLeaf(true)
      getUserHistory()
        .then(setLeafCases)
        .catch(() => setLeafCases([]))
        .finally(() => setLoadingLeaf(false))
    }
  }, [tab, leafCases.length])

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-xl bg-beige p-1">
        {([
          { key: 'voice', label: 'Voice', icon: Mic },
          { key: 'leaf', label: 'Leaf', icon: Leaf },
          { key: 'pest', label: 'Pest', icon: Bug },
        ] as { key: Tab; label: string; icon: typeof Mic }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-forest shadow-sm' : 'text-forest-muted'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'voice' &&
        (myVoice.length === 0 ? (
          <EmptyState icon={Mic} title="No voice diagnoses yet" />
        ) : (
          <div className="space-y-3">
            {myVoice.map((v) => (
              <Card key={v.id} className="flex items-center justify-between">
                <div>
                  <p className="font-sinhala font-medium text-forest">{diseaseSinhalaName(v.disease)}</p>
                  <p className="text-xs text-forest-muted">{formatDate(v.timestamp)}</p>
                </div>
                <span className="text-sm font-semibold text-forest-muted">{formatConfidence(v.confidence)}</span>
              </Card>
            ))}
          </div>
        ))}

      {tab === 'leaf' &&
        (loadingLeaf ? (
          <LoadingSpinner labelEn="Loading leaf history..." />
        ) : leafCases.length === 0 ? (
          <EmptyState icon={Leaf} title="No leaf analyses yet" />
        ) : (
          <div className="space-y-3">
            {leafCases.map((c) => (
              <Card key={c.case_id} className="flex items-center justify-between">
                <div>
                  <p className="font-sinhala font-medium text-forest">{diseaseSinhalaName(c.predicted_disease)}</p>
                  <p className="text-xs text-forest-muted">{formatDate(c.created_at)}</p>
                </div>
                <span className="text-sm font-semibold text-forest-muted">{formatConfidence(c.confidence)}</span>
              </Card>
            ))}
          </div>
        ))}

      {tab === 'pest' &&
        (myPest.length === 0 ? (
          <EmptyState icon={Bug} title="No pest detections yet" />
        ) : (
          <div className="space-y-3">
            {myPest.map((p) => (
              <Card key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-forest">{p.pest_name.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-forest-muted">{formatDate(p.timestamp)}</p>
                </div>
                <span className="text-sm font-semibold text-forest-muted">{formatConfidence(p.confidence)}</span>
              </Card>
            ))}
          </div>
        ))}
    </div>
  )
}
