import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { getBatches, getDashboardStats, prepareBatch, startBatch } from '@/lib/leafApi'
import type { Batch, DashboardStats } from '@/lib/leafApi'
import { formatDate } from '@/lib/disease'

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [s, b] = await Promise.all([getDashboardStats(), getBatches()])
      setStats(s)
      setBatches(b)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handlePrepareBatch() {
    setPreparing(true)
    try {
      const batch = await prepareBatch()
      setBatches((prev) => [batch, ...prev])
      toast.success(`Batch ${batch.batch_id} prepared`)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to prepare batch'
      toast.error(message)
    } finally {
      setPreparing(false)
    }
  }

  async function handleStartBatch(batchId: string) {
    setStartingId(batchId)
    try {
      await startBatch(batchId)
      toast.success('Retraining started')
      load()
    } catch {
      toast.error('Failed to start batch')
    } finally {
      setStartingId(null)
    }
  }

  if (loading) return <LoadingSpinner labelEn="Loading dashboard..." />
  if (!stats) return <EmptyState title="Unable to load dashboard" />

  const statCards = [
    { label: 'Pending Reviews', value: stats.pending_expert_reviews },
    { label: 'Verified Samples', value: stats.verified_expert_samples },
    { label: 'Approved for Training', value: stats.approved_for_training_samples },
    { label: 'Active Learning Eligible', value: stats.active_learning_eligible_samples },
    { label: 'Consumed Samples', value: stats.consumed_training_samples },
    { label: 'Active Models', value: stats.storage_summary.active_models },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <p className="text-2xl font-bold text-forest">{s.value}</p>
            <p className="text-xs text-forest-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-forest">Active Learning Batches</h3>
          <Button size="sm" onClick={handlePrepareBatch} loading={preparing}>
            Prepare New Batch
          </Button>
        </div>

        {batches.length === 0 ? (
          <p className="py-6 text-center text-sm text-forest-muted">No batches yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-beige text-xs uppercase text-forest-muted">
                <tr>
                  <th className="py-2">Batch</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Samples</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.batch_id} className="border-b border-beige/60 last:border-0">
                    <td className="py-3 font-mono text-xs">{b.batch_id}</td>
                    <td className="py-3 text-forest-light">{formatDate(b.created_at)}</td>
                    <td className="py-3">{b.sample_count}</td>
                    <td className="py-3">
                      <Badge tone={b.status === 'READY' ? 'amber' : 'green'}>{b.status}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      {b.status === 'READY' && (
                        <Button size="sm" variant="outline" onClick={() => handleStartBatch(b.batch_id)} loading={startingId === b.batch_id}>
                          Start
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
