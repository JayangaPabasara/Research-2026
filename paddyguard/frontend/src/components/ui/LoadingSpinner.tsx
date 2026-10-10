import { Loader2 } from 'lucide-react'
import { uiText } from '@/i18n/text'

interface LoadingSpinnerProps {
  size?: number
  label?: string
  labelEn?: string
}

export default function LoadingSpinner({ size = 40, label, labelEn }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-forest">
      <Loader2 style={{ width: size, height: size }} className="animate-spin" />
      {(labelEn || label) && <p role="status" className="text-sm text-forest-muted">{uiText(labelEn || label || '')}</p>}
    </div>
  )
}
