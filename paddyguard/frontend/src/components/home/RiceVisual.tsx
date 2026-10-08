import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const RiceScene = lazy(() => import('./RiceScene'))

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFailure()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function RiceFallback() {
  return (
    <svg className="pg-rice-fallback" viewBox="0 0 400 440" aria-hidden="true">
      <defs>
        <linearGradient id="pg-leaf" x1="0" x2="1" y2="1">
          <stop stopColor="#b9d888" />
          <stop offset="1" stopColor="#378557" />
        </linearGradient>
      </defs>
      <ellipse
        cx="205"
        cy="405"
        rx="105"
        ry="12"
        fill="#79b86a"
        opacity=".12"
      />
      {[-1, 0, 1].map((n) => (
        <g
          key={n}
          transform={`translate(${n * 34} ${Math.abs(n) * 25}) rotate(${n * 12} 200 400)`}
        >
          <path
            d="M200 400 Q188 240 207 89"
            stroke="#83a65b"
            strokeWidth="4"
            fill="none"
          />
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={
                i % 2
                  ? `M200 ${330 - i * 49} Q290 ${230 - i * 40} 303 ${170 - i * 25} Q223 ${215 - i * 36} 200 ${330 - i * 49}`
                  : `M200 ${340 - i * 49} Q105 ${255 - i * 40} 92 ${190 - i * 25} Q178 ${231 - i * 36} 200 ${340 - i * 49}`
              }
              fill="url(#pg-leaf)"
            />
          ))}
          <path
            d="M207 100 Q245 46 271 108"
            stroke="#c9ad62"
            strokeWidth="2"
            fill="none"
          />
          {Array.from({ length: 14 }, (_, i) => (
            <ellipse
              key={i}
              cx={212 + i * 4.3}
              cy={78 - Math.sin(i / 4) * 16 + i * 1.5}
              rx="4"
              ry="9"
              transform={`rotate(-30 ${212 + i * 4.3} ${78 - Math.sin(i / 4) * 16 + i * 1.5})`}
              fill={i % 2 ? '#d7b76e' : '#efcf87'}
            />
          ))}
        </g>
      ))}
    </svg>
  )
}

export default function RiceVisual() {
  const container = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(true)
  const [ready, setReady] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(true)
  useEffect(() => {
    const media = window.matchMedia(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)'
    )
    const device = navigator as Navigator & {
      deviceMemory?: number
      connection?: { saveData?: boolean }
    }
    const update = () =>
      setEnabled(
        media.matches &&
          !device.connection?.saveData &&
          (device.deviceMemory ?? 8) >= 4 &&
          (navigator.hardwareConcurrency || 4) >= 4
      )
    update()
    media.addEventListener('change', update)
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting)
    )
    if (container.current) observer.observe(container.current)
    const visibility = () =>
      setDocumentVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', visibility)
    return () => {
      media.removeEventListener('change', update)
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  const showScene = enabled && visible && documentVisible
  useEffect(() => {
    if (!showScene) setReady(false)
  }, [showScene])
  return (
    <div ref={container} className="pg-rice-visual" aria-hidden="true">
      <div
        className="pg-fallback-layer"
        style={{ opacity: showScene && ready ? 0 : 1 }}
      >
        <RiceFallback />
      </div>
      {showScene && (
        <SceneBoundary onFailure={() => setEnabled(false)}>
          <Suspense fallback={null}>
            <RiceScene
              onFailure={() => setEnabled(false)}
              onReady={() => setReady(true)}
            />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  )
}
