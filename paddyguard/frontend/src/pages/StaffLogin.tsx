import { uiText } from '@/i18n/text'
import { useState } from 'react'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import AuthLoginButton from '@/components/auth/AuthLoginButton'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import { staffLogin } from '@/lib/leafApi'
import { getErrorMessage } from '@/lib/api'

export default function StaffLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const auth = await staffLogin(username, password)
      if (auth.role === 'SUPER_ADMIN') navigate('/dashboard')
      else if (auth.role === 'EXPERT') navigate('/expert-review')
      else navigate('/leaf')
    } catch (err: unknown) {
      const message = getErrorMessage(err, uiText("Login failed. Please try again."))
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout title={t('auth.staffLogin')} subtitle={t('auth.staffHelp')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input aria-describedby={error ? 'auth-error' : undefined} label={uiText("Username")} value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          <Input aria-describedby={error ? 'auth-error' : undefined} label={uiText("Password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />

          {error && <p id="auth-error" role="alert" className="rounded-xl bg-red-soft/10 px-4 py-2 text-sm text-red-soft">{error}</p>}

          <AuthLoginButton loading={loading}>
            {uiText("Sign In")}</AuthLoginButton>
        </form>

        <div className="mt-6 border-t border-beige pt-4 text-center">
          <Link to="/login" className="text-xs text-forest-muted hover:text-forest">
            {uiText("← Back to farmer login")}</Link>
        </div>
    </AuthSplitLayout>
  )
}
