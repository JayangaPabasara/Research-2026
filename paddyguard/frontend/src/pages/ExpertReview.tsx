import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { getReviewQueue, verifyCase } from '@/lib/leafApi'
import type { ReviewQueueItem } from '@/lib/leafApi'
import { formatConfidence, formatDate } from '@/lib/disease'

const DISEASE_OPTIONS = ['Bacterial_Blight', 'Brown_Spot', 'Healthy', 'Leaf_Blast']

export default function ExpertReview() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [verifying, setVerifying] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getReviewQueue()
      setQueue(data)
    } catch {
      toast.error('Failed to load review queue')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(caseId: string) {
    const label = selections[caseId]
    if (!label) {
      toast.error('Select the correct disease label first')
      return
    }
    setVerifying(caseId)
    try {
      await verifyCase(caseId, label)
      setQueue((prev) => prev.filter((c) => c.case_id !== caseId))
      toast.success('Case verified')
    } catch {
      toast.error('Verification failed')
    } finally {
      setVerifying(null)
    }
  }

  if (loading) return <LoadingSpinner labelEn="Loading review queue..." />
  if (queue.length === 0) return <EmptyState title="Review queue is empty" description="No cases currently need expert review." />

  return (
    <div className="space-y-4">
      {queue.map((c) => (
        <Card key={c.case_id} className="flex flex-col gap-4 sm:flex-row">
          {c.original_image_url && (
            <img src={c.original_image_url} alt={c.case_id} className="h-32 w-full rounded-xl object-cover sm:w-40" />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-forest-muted">{c.case_id}</span>
              {c.review_reason && <Badge tone="amber">{c.review_reason}</Badge>}
            </div>
            <p className="mt-1 font-semibold text-forest">
              AI Prediction: {c.predicted_disease?.replace(/_/g, ' ')} ({formatConfidence(c.confidence)})
            </p>
            <p className="text-xs text-forest-muted">{formatDate(c.created_at)} · {c.city || 'Unknown location'}</p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select
                value={selections[c.case_id] || ''}
                onChange={(e) => setSelections((prev) => ({ ...prev, [c.case_id]: e.target.value }))}
                className="h-11 flex-1 rounded-xl border border-beige bg-beige px-3 text-sm text-forest outline-none focus:border-forest"
              >
                <option value="">Select correct label…</option>
                {DISEASE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <Button onClick={() => handleVerify(c.case_id)} loading={verifying === c.case_id}>
                Verify
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
