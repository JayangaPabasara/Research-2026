import { useEffect, useState } from 'react'
import { Mic, Leaf, Bug } from 'lucide-react'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { useDiagnosisStore } from '@/store/diagnosisStore'
import { getCases, getUserHistory, deleteCase, getLeafAuth } from '@/lib/leafApi'
import type { CaseSummary } from '@/lib/leafApi'
import { diseaseSinhalaName, formatConfidence, formatDate } from '@/lib/disease'
import toast from 'react-hot-toast'

// Scoped Leaf imports
import UserAnalyticsOverview from '@/components/leaf/UserAnalyticsOverview'
import HistoryTable from '@/components/leaf/HistoryTable'
import ActivityModal from '@/components/leaf/ActivityModal'
import '@/components/leaf/leafStyles.css'

type Tab = 'voice' | 'leaf' | 'pest'

export default function History() {
  const [tab, setTab] = useState<Tab>('voice')
  const [leafCases, setLeafCases] = useState<CaseSummary[]>([])
  const [loadingLeaf, setLoadingLeaf] = useState(false)
  const [selectedLeafCase, setSelectedLeafCase] = useState<CaseSummary | null>(null)

  const user = useAuthStore((s) => s.user)
  const leafAuth = getLeafAuth()
  const isStaff = leafAuth?.role === 'EXPERT' || leafAuth?.role === 'SUPER_ADMIN'
  
  const { voiceHistory, pestHistory } = useDiagnosisStore()
  const myVoice = voiceHistory.filter((v) => v.userId === user?.id)
  const myPest = pestHistory.filter((p) => p.userId === user?.id)

  useEffect(() => {
    if (tab === 'leaf') {
      loadLeafHistory()
    }
  }, [tab])

  async function loadLeafHistory() {
    setLoadingLeaf(true)
    try {
      const data = isStaff ? await getCases(leafAuth?.username) : await getUserHistory()
      setLeafCases(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load leaf history')
    } finally {
      setLoadingLeaf(false)
    }
  }

  async function handleDeleteLeaf(caseId: string) {
    try {
      await deleteCase(caseId)
      setLeafCases((prev) => prev.filter((c) => c.case_id !== caseId))
      toast.success('Case removed successfully')
    } catch {
      toast.error('Failed to delete case')
    }
  }

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

      {tab === 'leaf' && (
        <div className="leaf-module space-y-6">
          <UserAnalyticsOverview />
          
          <div className="card">
            <h2 className="text-lg font-bold text-forest mb-4" style={{ margin: '0 0 1rem 0' }}>Prediction History</h2>
            {loadingLeaf ? (
              <LoadingSpinner labelEn="Loading history..." />
            ) : (
              <HistoryTable 
                cases={leafCases} 
                onRowClick={setSelectedLeafCase} 
                onDelete={handleDeleteLeaf} 
              />
            )}
          </div>

          <ActivityModal 
            caseData={selectedLeafCase} 
            onClose={() => setSelectedLeafCase(null)} 
          />
        </div>
      )}

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
