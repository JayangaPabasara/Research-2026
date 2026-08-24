import { useNavigate } from 'react-router-dom'
import { Mic, Leaf, Bug } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useDiagnosisStore } from '@/store/diagnosisStore'
import { formatDate } from '@/lib/disease'

interface ModuleCard {
  key: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  icon: typeof Mic
  iconBg: string
  to: string
  featured?: boolean
}

const MODULES: ModuleCard[] = [
  {
    key: 'voice',
    title: 'හඬ රෝග නිර්ණය',
    subtitle: 'Voice-Based Disease Diagnosis',
    description: 'සිංහලෙන් ලක්ෂණ විස්තර කර රෝගය හඳුනාගන්න',
    tags: ['SVM 96.67% F1', 'Whisper ASR', 'OOD Detection'],
    icon: Mic,
    iconBg: 'bg-amber',
    to: '/voice',
    featured: true,
  },
  {
    key: 'leaf',
    title: 'කොළ රෝග හඳුනාගැනීම',
    subtitle: 'Leaf Image Classification',
    description: 'ගොයම් කොළ ඡායාරූපයෙන් රෝගය හඳුනාගන්න',
    tags: ['CNN EfficientNet-B3', 'Grad-CAM', 'OOD Detection'],
    icon: Leaf,
    iconBg: 'bg-green-soft',
    to: '/leaf',
  },
  {
    key: 'pest',
    title: 'කෘමි හඳුනාගැනීම',
    subtitle: 'Pest Detection',
    description: 'කෘමිය ඡායාරූපයෙන් හඳුනාගෙන ප්‍රතිකාර ලබාගන්න',
    tags: ['DenseNet121', 'Few-Shot Learning', 'OOD Detection'],
    icon: Bug,
    iconBg: 'bg-amber-dark',
    to: '/pest',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { voiceHistory, pestHistory } = useDiagnosisStore()

  const userHistory = user ? voiceHistory.filter((v) => v.userId === user.id).concat() : []
  const totalDiagnoses = userHistory.length + pestHistory.filter((p) => p.userId === user?.id).length
  const mostRecent = userHistory[0]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-sinhala text-2xl font-bold text-forest">
          ආයුබෝවන්, {user?.full_name || 'ගොවියා'}!
        </h2>
        <p className="font-sinhala text-forest-muted">ඔබේ ගොයමේ රෝගය හඳුනාගැනීමට ක්‍රමයක් තෝරන්න</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {MODULES.map((mod) => (
          <Card
            key={mod.key}
            hoverable
            className={mod.featured ? 'border-2 border-amber' : ''}
          >
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${mod.iconBg}`}>
              <mod.icon className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-sinhala text-lg font-bold text-forest">{mod.title}</h3>
            <p className="text-sm text-forest-muted">{mod.subtitle}</p>
            <p className="font-sinhala mt-2 text-sm text-forest-light">{mod.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {mod.tags.map((tag) => (
                <Badge key={tag} tone="amber">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button
              variant={mod.featured ? 'primary' : 'outline'}
              className="mt-5 w-full font-sinhala"
              onClick={() => navigate(mod.to)}
            >
              ආරම්භ කරන්න | Start
            </Button>
          </Card>
        ))}
      </div>

      {totalDiagnoses > 0 && (
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-forest-muted">Total Diagnoses</p>
              <p className="text-xl font-bold text-forest">{totalDiagnoses}</p>
            </div>
            <div>
              <p className="text-xs text-forest-muted">Most Recent Disease</p>
              <p className="text-xl font-bold text-forest">{mostRecent?.disease || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-forest-muted">Last Diagnosis</p>
              <p className="text-xl font-bold text-forest">{mostRecent ? formatDate(mostRecent.timestamp) : '-'}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
