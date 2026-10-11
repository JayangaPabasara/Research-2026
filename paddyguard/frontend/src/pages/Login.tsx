import { uiText } from '@/i18n/text'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import AuthLoginButton from '@/components/auth/AuthLoginButton'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import { login, getProfile } from '@/lib/authApi'
import { ensureLeafSession } from '@/lib/leafApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/api'

export default function Login({ systemAdmin = false }: { systemAdmin?: boolean }) {
  const { t, i18n } = useTranslation()
  const [adminOpen, setAdminOpen] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const tokens = await login(email, password)
      setAuth({ id: '', email, full_name: null, role: 'FARMER' }, tokens.access_token, tokens.refresh_token)

      const profile = await getProfile()
      if (!profile.is_active || (systemAdmin && profile.role !== 'SYSTEM_ADMIN')) {
        useAuthStore.getState().logout()
        throw new Error(t('unauthorized'))
      }
      useAuthStore.getState().updateUser(profile)
      await i18n.changeLanguage(profile.preferred_language)
      if (profile.role === 'FARMER') ensureLeafSession(email, password, profile.full_name || undefined)
      navigate(profile.role === 'SYSTEM_ADMIN' ? '/system-admin' : '/')
    } catch (err: unknown) {
      useAuthStore.getState().logout()
      const message = getErrorMessage(err, err instanceof Error && !('response' in err) ? err.message : t('error'))
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout title={t(systemAdmin ? 'auth.adminLogin' : 'auth.farmerLogin')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            aria-describedby={error ? 'auth-error' : undefined}
            label={t('email')}
            sinhalaLabel
            type="email"
            placeholder="farmer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            aria-describedby={error ? 'auth-error' : undefined}
            label={t('password')}
            sinhalaLabel
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <p id="auth-error" role="alert" className="rounded-xl bg-red-soft/10 px-4 py-2 text-sm text-red-soft">{error}</p>}

          <AuthLoginButton loading={loading}>
            {t('login')}
          </AuthLoginButton>
        </form>

        {!systemAdmin && <p className="mt-5 text-center font-sinhala text-sm text-forest">
          {uiText("ගිණුමක් නැද්ද?")}{' '}
          <Link to="/register" className="font-semibold text-amber">
            {uiText("ලියාපදිංචි වන්න")}</Link>
        </p>}
        {systemAdmin && <Link to="/login" className="mt-5 block text-center text-sm">{t('auth.back')}</Link>}

        <div className="mt-6 border-t border-beige pt-4 text-center space-y-2">
          <Link to="/staff-login" className="block text-xs text-forest-muted hover:text-forest">
            {uiText("Staff / Expert login →")}</Link>
          <button type="button" aria-expanded={adminOpen} aria-controls="admin-access" onClick={() => setAdminOpen(!adminOpen)} className="flex w-full items-center justify-between rounded-xl p-3 text-sm text-forest">{t('adminAccess')}<ChevronDown className={`h-4 w-4 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} /></button>
          <div id="admin-access" className="grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none" style={{ gridTemplateRows: adminOpen ? '1fr' : '0fr' }} inert={!adminOpen}>
            <div className="overflow-hidden"><div className="space-y-3 p-3"><Link to="/pest-admin-login" className="block text-sm text-forest">{t('pestAdmin')}</Link><Link to="/system-admin-login" className="block text-sm text-forest">{t('adminLogin')}</Link></div></div>
          </div>
        </div>
    </AuthSplitLayout>
  )
}
