import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Mic,
  Leaf,
  Bug,
  MessageCircle,
  Wheat,
  Clock,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDiagnosisStore } from '@/store/diagnosisStore'
import { formatDate } from '@/lib/disease'
import RiceVisual from '@/components/home/RiceVisual'
import './home.css'

const modules = [
  {
    key: 'voice',
    icon: Mic,
    label: 'හඬ රෝග විනිශ්චය',
    title: 'Sinhala Voice Diagnosis',
    description: 'ඔබේ වගාවේ රෝග ලක්ෂණ සිංහලෙන් කියන්න.',
    detail: 'Describe symptoms in your own words.',
    to: '/voice',
    cta: 'Start speaking',
  },
  {
    key: 'leaf',
    icon: Leaf,
    label: 'කොළ රෝග හඳුනාගැනීම',
    title: 'Leaf Disease Detection',
    description: 'වී කොළයක ඡායාරූපයක් මඟින් රෝග හඳුනාගන්න.',
    detail: 'Explore image-based leaf diagnosis.',
    to: '/leaf',
    cta: 'Analyze a leaf',
  },
  {
    key: 'pest',
    icon: Bug,
    label: 'කෘමි හඳුනාගැනීම',
    title: 'Pest Detection',
    description: 'වගාවට හානි කරන කෘමීන් හඳුනාගන්න.',
    detail: 'Upload a pest photo for AI analysis.',
    to: '/pest',
    cta: 'Identify a pest',
  },
  {
    key: 'chat',
    icon: MessageCircle,
    label: 'ප්‍රතිකාර උපදේශක',
    title: 'Treatment Advisory',
    description: 'ඔබේ වගාව සඳහා ප්‍රතිකාර උපදෙස් ලබාගන්න.',
    detail: 'Ask the knowledge assistant for guidance.',
    to: '/chat',
    cta: 'Ask for guidance',
  },
]

export default function Home() {
  const user = useAuthStore((s) => s.user)
  const { voiceHistory, pestHistory } = useDiagnosisStore()
  const reducedMotion = useReducedMotion()
  const voice = user
    ? voiceHistory.filter((entry) => entry.userId === user.id)
    : []
  const pest = user
    ? pestHistory.filter((entry) => entry.userId === user.id)
    : []
  const recentDisease = [...voice].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
  )[0]
  const latest = [...voice, ...pest].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
  )[0]
  const total = voice.length + pest.length

  return (
    <div className="pg-home">
      <div className="pg-welcome">
        <div>
          <p className="pg-eyebrow">YOUR FIELD. YOUR FUTURE.</p>
          <h2>
            <span lang="si">ආයුබෝවන්</span>, {user?.full_name || 'Farmer'}{' '}
            <Leaf size={21} />
          </h2>
        </div>
        <span className="pg-research">
          <Wheat size={15} /> Agricultural AI · Research project
        </span>
      </div>
      <section className="pg-hero" aria-labelledby="hero-heading">
        <div className="pg-hero-copy">
          <p className="pg-eyebrow">
            <span className="pg-dot" /> INTELLIGENCE ROOTED IN AGRICULTURE
          </p>
          <h2 id="hero-heading">
            Protecting Every
            <br />
            Rice Leaf <em>with AI.</em>
          </h2>
          <p lang="si" className="pg-sinhala">
            සිංහල හඬ සහ AI තාක්ෂණයෙන් ඔබේ වී වගාව සුරකිමු
          </p>
          <p className="pg-hero-description">
            From the first sign to the next step. Explore voice and image
            diagnosis, and find treatment guidance for your rice crop.
          </p>
          <div className="pg-actions">
            <Link to="/voice" className="pg-primary">
              <Mic size={18} /> Start Voice Diagnosis <ArrowRight size={17} />
            </Link>
            <Link to="/history" className="pg-secondary">
              View History <ArrowRight size={16} />
            </Link>
          </div>
          <div className="pg-capabilities">
            {modules.map(({ icon: Icon, title }) => (
              <span key={title}>
                <Icon size={13} />
                {title.replace('Diagnosis', 'AI').replace('Disease ', '')}
              </span>
            ))}
          </div>
        </div>
        <div className="pg-hero-art">
          <div className="pg-orbit pg-orbit-one" />
          <div className="pg-orbit pg-orbit-two" />
          <RiceVisual />
          <span className="pg-plant-tag">
            <Leaf size={14} /> Oryza sativa <span>Rice plant</span>
          </span>
          <span className="pg-art-caption">GROWING A HEALTHIER TOMORROW</span>
        </div>
      </section>
      <section className="pg-statistics" aria-label="Your diagnosis statistics">
        <div className="pg-stat">
          <Activity size={21} />
          <div>
            <p>Total Diagnoses</p>
            <strong>{total}</strong>
            <small>Saved Voice & Pest analyses</small>
          </div>
        </div>
        <div className="pg-stat">
          <Leaf size={21} />
          <div>
            <p>Most Recent Disease</p>
            <strong>
              {recentDisease?.disease || 'No voice diagnosis yet'}
            </strong>
            <small>From your Voice history</small>
          </div>
        </div>
        <div className="pg-stat">
          <Clock size={21} />
          <div>
            <p>Last Diagnosis</p>
            <strong>
              {latest && Number.isFinite(Date.parse(latest.timestamp))
                ? formatDate(latest.timestamp)
                : 'No diagnosis yet'}
            </strong>
            <small>
              {total
                ? 'From your saved history'
                : 'Start a diagnosis to build your history'}
            </small>
          </div>
        </div>
      </section>
      <section aria-labelledby="features-heading">
        <div className="pg-section-heading">
          <div>
            <p className="pg-eyebrow">ONE CROP. MULTIPLE PERSPECTIVES.</p>
            <h2 id="features-heading">A little intelligence. A lot of care.</h2>
          </div>
          <span>Choose how you want to begin</span>
        </div>
        <div className="pg-features">
          {modules.map((mod, index) => (
            <motion.div
              key={mod.key}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
            >
              <Link to={mod.to} className={`pg-feature pg-feature-${mod.key}`}>
                <div className="pg-feature-top">
                  <span className="pg-feature-icon">
                    <mod.icon size={25} />
                  </span>
                  <span className="pg-feature-number">0{index + 1}</span>
                </div>
                <div className="pg-feature-motif" aria-hidden="true">
                  {mod.key === 'voice' ? (
                    Array.from({ length: 17 }, (_, i) => (
                      <i
                        key={i}
                        style={{
                          height: `${12 + Math.sin(i * 1.7) ** 2 * 34}px`,
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))
                  ) : (
                    <mod.icon size={72} strokeWidth={0.8} />
                  )}
                </div>
                <h3 lang="si">{mod.label}</h3>
                <p className="pg-feature-title">{mod.title}</p>
                <p lang="si" className="pg-feature-description">
                  {mod.description}
                </p>
                <p className="pg-feature-detail">{mod.detail}</p>
                <span className="pg-feature-cta">
                  {mod.cta}
                  <ArrowRight size={17} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
      <section
        className="pg-architecture"
        aria-labelledby="architecture-heading"
      >
        <div className="pg-section-heading">
          <div>
            <p className="pg-eyebrow">THE RESEARCH BEHIND THE CARE</p>
            <h2 id="architecture-heading">How PaddyGuard AI Works</h2>
          </div>
          <span>Multimodal inputs. Informed guidance.</span>
        </div>
        <div className="pg-flow">
          <div className="pg-flow-inputs">
            {modules.slice(0, 3).map(({ icon: Icon, title, label }) => (
              <div className="pg-flow-node" key={title}>
                <Icon size={20} />
                <div>
                  <strong>
                    {title
                      .replace('Sinhala Voice Diagnosis', 'Voice NLP')
                      .replace('Leaf Disease Detection', 'Leaf Disease AI')
                      .replace('Pest Detection', 'Pest Detection AI')}
                  </strong>
                  <span lang="si">{label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pg-connectors" aria-hidden="true">
            <svg viewBox="0 0 200 180" preserveAspectRatio="none">
              <path d="M0 28 H65 Q95 28 95 58 V90 H200 M0 90 H200 M0 152 H65 Q95 152 95 122 V90" />
            </svg>
            <ArrowRight size={20} />
          </div>
          <Link to="/chat" className="pg-flow-result">
            <span className="pg-result-icon">
              <MessageCircle size={25} />
            </span>
            <div>
              <strong>Hybrid Treatment Advisory</strong>
              <span lang="si">ප්‍රතිකාර උපදෙස්</span>
              <p>Knowledge-based guidance for your next step.</p>
            </div>
            <ArrowRight size={20} />
          </Link>
        </div>
        <p className="pg-research-note">
          Conceptual research architecture: voice and image analysis inform the
          treatment advisory approach. This diagram does not establish
          validation of automated integration between modules.
        </p>
      </section>
      <footer className="pg-footer">
        <span>
          <Wheat size={16} /> PaddyGuard AI
        </span>
        <p>Thoughtfully built for the people who grow our food.</p>
        <span>University research project</span>
      </footer>
    </div>
  )
}
