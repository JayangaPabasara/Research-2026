import { AlertCircle, AlertTriangle, Bug } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatConfidence } from '@/lib/disease'
import type { PestDetectionResult } from '@/lib/pestApi'

export default function PestResult({ result }: { result: PestDetectionResult }) {
  if (result.status === 'unknown') {
    return (
      <Card className="border-2 border-red-soft/30 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-soft/10">
          <AlertCircle className="h-8 w-8 text-red-soft" />
        </div>
        <h3 className="font-sinhala text-lg font-bold text-forest">හඳුනාගත නොහැකි විය</h3>
        <p className="mt-1 text-sm text-forest-muted">{result.message}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Bug className="h-5 w-5 text-amber" />
              <span className="text-xl font-bold text-forest">{result.prediction.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm text-forest-muted">Source: {result.source.replace(/_/g, ' ')}</p>
          </div>
          <Badge tone={result.status === 'known' ? 'green' : 'amber'}>{formatConfidence(result.confidence)}</Badge>
        </div>

        {result.status === 'maybe' && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-light px-4 py-2 text-xs text-amber-dark">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {result.message}
          </div>
        )}
      </Card>

      {result.gradcam_image_base64 && (
        <Card>
          <h4 className="mb-2 text-sm font-semibold text-forest-muted">Grad-CAM — Detected Region</h4>
          <img
            src={`data:image/png;base64,${result.gradcam_image_base64}`}
            alt="Grad-CAM heatmap"
            className="w-full rounded-xl object-cover"
          />
        </Card>
      )}

      {!result.quality.passed && result.quality.warnings.length > 0 && (
        <Card className="bg-beige">
          <h4 className="mb-2 text-sm font-semibold text-forest-muted">Image Quality Warnings</h4>
          <ul className="list-inside list-disc space-y-1 text-xs text-forest-light">
            {result.quality.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
