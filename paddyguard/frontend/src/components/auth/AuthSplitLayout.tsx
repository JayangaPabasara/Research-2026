import type { ReactNode } from 'react'
import { Wheat, Sprout, ScanLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/community/LanguageSwitcher'
import AuthTranslationIcon from './AuthTranslationIcon'
import './auth.css'

export default function AuthSplitLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <main className="pg-auth">
      <div className="pg-auth-photo" aria-hidden="true" />
      <div className="pg-auth-language"><AuthTranslationIcon /><LanguageSwitcher /></div>
      <section className="pg-auth-panel" aria-labelledby="auth-title">
        <div className="pg-auth-brand"><span className="pg-auth-logo"><Wheat aria-hidden="true" /></span><span>PaddyGuard <strong>AI</strong></span></div>
        <div className="pg-auth-mobile-intro"><p>{t('auth.tagline')}</p><p>{t('auth.hero')}</p></div>
        <div className="pg-auth-card">
          <div className="pg-auth-heading"><p className="pg-auth-eyebrow">{t('auth.welcome')}</p><h1 id="auth-title">{title}</h1><p>{subtitle || t('auth.signInHelp')}</p></div>
          {children}
        </div>
        <p className="pg-auth-footer"><Sprout size={15} aria-hidden="true" />{t('auth.footer')}</p>
      </section>
      <aside className="pg-auth-hero" aria-label={t('auth.tagline')}>
        <div className="pg-auth-hero-top"><Wheat size={25} aria-hidden="true" /><span>PaddyGuard AI</span></div>
        <div className="pg-auth-hero-copy"><span className="pg-auth-badge"><ScanLine size={17} aria-hidden="true" />{t('auth.tagline')}</span><h2>{t('auth.hero')}</h2><p>{t('auth.heroBody')}</p><div className="pg-auth-rule" /></div>
        <p className="pg-auth-hero-bottom"><Sprout size={19} aria-hidden="true" />{t('auth.footer')}</p>
      </aside>
    </main>
  )
}
