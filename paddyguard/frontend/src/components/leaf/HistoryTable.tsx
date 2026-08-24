import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { diseaseSinhalaName, formatConfidence, formatDate, severityLabel } from '@/lib/disease'
import type { CaseSummary } from '@/lib/leafApi'

interface HistoryTableProps {
  cases: CaseSummary[]
  onRowClick: (c: CaseSummary) => void
  onDelete: (caseId: string) => Promise<void>
}

export default function HistoryTable({ cases, onRowClick, onDelete }: HistoryTableProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (cases.length === 0) {
    return <EmptyState title="No analyses yet" description="Analyzed leaf images will appear here." />
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await onDelete(pendingDelete)
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-beige text-xs uppercase text-forest-muted">
          <tr>
            <th className="px-4 py-3">Case</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Disease</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const severity = severityLabel(c.severity_percentage)
            return (
              <tr
                key={c.case_id}
                onClick={() => onRowClick(c)}
                className="cursor-pointer border-b border-beige/60 last:border-0 hover:bg-beige/40"
              >
                <td className="px-4 py-3 font-mono text-xs text-forest-muted">{c.case_id}</td>
                <td className="px-4 py-3 text-forest-light">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3 font-medium text-forest">
                  <span className="font-sinhala">{diseaseSinhalaName(c.predicted_disease)}</span>
                </td>
                <td className="px-4 py-3">{formatConfidence(c.confidence)}</td>
                <td className="px-4 py-3">
                  {c.severity_percentage != null ? (
                    <Badge tone={severity.label === 'Severe' ? 'red' : severity.label === 'Moderate' ? 'amber' : 'green'}>
                      {severity.label}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3 text-forest-light">{c.city || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDelete(c.case_id)
                    }}
                    className="rounded-lg p-1.5 text-red-soft hover:bg-red-soft/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete case"
        message="This will permanently delete this analysis. This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
