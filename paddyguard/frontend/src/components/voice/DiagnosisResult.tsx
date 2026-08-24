import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfidenceBar from './ConfidenceBar'
import { diseaseColor, diseaseSinhalaName, formatConfidence } from '@/lib/disease'
import type { VoiceDiagnosisResult } from '@/lib/voiceApi'

interface DiagnosisResultProps {
  result: VoiceDiagnosisResult
  onNewDiagnosis: () => void
}

export default function DiagnosisResult({ result, onNewDiagnosis }: DiagnosisResultProps) {
  const color = diseaseColor(result.disease)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" style={{ color }} />
              <span className="font-sinhala text-xl font-bold text-forest">{diseaseSinhalaName(result.disease)}</span>
            </div>
            <p className="text-sm text-forest-muted">{result.disease}</p>
          </div>
          <Badge tone={result.confidence >= 0.75 ? 'green' : 'amber'}>{formatConfidence(result.confidence)}</Badge>
        </div>

        {(result.sinhala_transcript || result.english_translation) && (
          <div className="mt-4 space-y-1 rounded-xl bg-beige p-4">
            {result.sinhala_transcript && <p className="font-sinhala text-sm text-forest">"{result.sinhala_transcript}"</p>}
            {result.english_translation && <p className="text-xs italic text-forest-muted">{result.english_translation}</p>}
          </div>
        )}
      </Card>

      <Card>
        <h4 className="mb-3 text-sm font-semibold text-forest-muted">Confidence Breakdown</h4>
        <ConfidenceBar allScores={result.all_scores} disease={result.disease} />
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onNewDiagnosis}>
          නැවත | New Diagnosis
        </Button>
        <Button variant="primary" className="flex-1" disabled>
          ප්‍රතිකාර | Treatment
        </Button>
      </div>
    </motion.div>
  )
}
