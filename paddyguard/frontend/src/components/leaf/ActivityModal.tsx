import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { diseaseSinhalaName, formatConfidence, formatDate, severityLabel } from '@/lib/disease'
import type { CaseSummary } from '@/lib/leafApi'

interface ActivityModalProps {
  caseData: CaseSummary | null
  onClose: () => void
}

export default function ActivityModal({ caseData, onClose }: ActivityModalProps) {
  if (!caseData) return null
  const severity = severityLabel(caseData.severity_percentage)

  return (
    <Modal isOpen={Boolean(caseData)} onClose={onClose} title={caseData.case_id} size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        {caseData.original_image_url && (
          <img src={caseData.original_image_url} alt="Leaf" className="w-full rounded-xl object-cover" />
        )}
        {caseData.gradcam_image_url && (
          <img src={caseData.gradcam_image_url} alt="Grad-CAM" className="w-full rounded-xl object-cover" />
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sinhala text-lg font-bold text-forest">
            {diseaseSinhalaName(caseData.predicted_disease)}
          </span>
          <Badge tone={caseData.confidence >= 0.75 ? 'green' : 'amber'}>{formatConfidence(caseData.confidence)}</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-forest-muted">Date</dt>
            <dd className="font-medium text-forest">{formatDate(caseData.created_at)}</dd>
          </div>
          <div>
            <dt className="text-forest-muted">City</dt>
            <dd className="font-medium text-forest">{caseData.city || '-'}</dd>
          </div>
          <div>
            <dt className="text-forest-muted">Severity</dt>
            <dd className="font-medium text-forest">
              {caseData.severity_percentage != null ? `${severity.label} (${caseData.severity_percentage.toFixed(1)}%)` : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-forest-muted">Review Status</dt>
            <dd className="font-medium text-forest">{caseData.review_status || '-'}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  )
}
