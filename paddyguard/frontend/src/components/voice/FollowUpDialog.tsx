import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatConfidence } from '@/lib/disease'

interface FollowUpDialogProps {
  question: string
  questionEn: string
  questionNumber: number
  maxQuestions: number
  confidence: number
  onAnswer: (answer: string) => void
  onSkip: () => void
  loading?: boolean
}

export default function FollowUpDialog({
  question,
  questionEn,
  questionNumber,
  maxQuestions,
  confidence,
  onAnswer,
  onSkip,
  loading = false,
}: FollowUpDialogProps) {
  const [recording, setRecording] = useState(false)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <motion.div
          className="absolute inset-0 bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onSkip}
        />
        <motion.div
          className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl"
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-beige" />

          <div className="mb-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: maxQuestions }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < questionNumber ? 'w-6 bg-amber' : 'w-1.5 bg-beige'
                }`}
              />
            ))}
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-light px-4 py-2.5 text-sm text-amber-dark">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>අඩු විශ්වාසනීයත්වයක් ({formatConfidence(confidence)}) — තවත් විස්තර අවශ්‍යයි</span>
          </div>

          <div className="mb-6 rounded-2xl bg-beige p-5 text-center">
            <p className="font-sinhala text-lg font-semibold text-forest">{question}</p>
            <p className="mt-1 text-sm italic text-forest-muted">{questionEn}</p>
          </div>

          <div className="mb-5 flex justify-center">
            <button
              onClick={() => setRecording((r) => !r)}
              className={`flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-lg transition-colors ${
                recording ? 'border-red-soft bg-red-50' : 'border-forest bg-white'
              }`}
            >
              <Mic className={`h-7 w-7 ${recording ? 'text-red-soft' : 'text-forest'}`} />
            </button>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={() => onAnswer('නෑ')} loading={loading}>
              නෑ | No
            </Button>
            <Button className="flex-1" variant="primary" onClick={() => onAnswer('ඔව්')} loading={loading}>
              ඔව් | Yes
            </Button>
          </div>

          <button onClick={onSkip} className="mt-4 w-full text-center text-sm text-forest-muted underline">
            මඟ හරින්න | Skip
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
