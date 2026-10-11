import { uiText } from '@/i18n/text'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { register, getProfile } from '@/lib/authApi'
import { ensureLeafSession } from '@/lib/leafApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/api'
import { useTranslation } from 'react-i18next'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import { updateProfile } from '@/lib/communityApi'

export default function Register() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')

    if (password.length < 8) {
      setError(uiText("Password must be at least 8 characters."))
      return
    }
    if (new TextEncoder().encode(password).length > 72) { setError(t('passwordBytes')); return }
    if (password !== confirmPassword) {
      setError(uiText("Passwords do not match."))
      return
    }

    setLoading(true)
    try {
      const tokens = await register(email, password, fullName || undefined)
      setAuth({ id: '', email, full_name: fullName || null, role: 'FARMER' }, tokens.access_token, tokens.refresh_token)

      const profile = await getProfile()
      useAuthStore.getState().updateUser(profile)
      await i18n.changeLanguage(profile.preferred_language)

      ensureLeafSession(email, password, fullName || undefined)
      setShowLocationModal(true)
    } catch (err: unknown) {
      useAuthStore.getState().logout()
      const message = getErrorMessage(err, uiText("Registration failed. Please try again."))
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAllowLocation() {
    setLocationLoading(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0,
        })
      )
      // Reverse geocode to get district name only
      // Use free nominatim API — no key needed
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
      )
      const geo = await r.json()
      const district =
        geo?.address?.state_district ||
        geo?.address?.county ||
        geo?.address?.state ||
        'Unknown'
      // Save district name only to localStorage — no GPS stored
      localStorage.setItem('paddyguard_location', district)
      useAuthStore.getState().updateUser(await updateProfile({ district }))
      toast.success(`Location set to ${district}`)
    } catch {
      // Silently ignore — location is optional
    } finally {
      setLocationLoading(false)
      setShowLocationModal(false)
      navigate('/')
    }
  }

  function handleSkipLocation() {
    setShowLocationModal(false)
    navigate('/')
  }

  return (
    <AuthSplitLayout title={t('auth.register')} subtitle={t('auth.registerHelp')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            aria-describedby={error ? 'auth-error' : undefined}
            label={t('fullName')}
            autoComplete="name"
            sinhalaLabel
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            aria-describedby={error ? 'auth-error' : undefined}
            label={t('email')}
            sinhalaLabel
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            aria-describedby={error ? 'auth-error' : undefined}
            label={t('password')}
            sinhalaLabel
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            aria-describedby={error ? 'auth-error' : undefined}
            label={uiText("මුරපදය තහවුරු කරන්න | Confirm Password")}
            sinhalaLabel
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && <p id="auth-error" role="alert" className="rounded-xl bg-red-soft/10 px-4 py-2 text-sm text-red-soft">{error}</p>}

          <Button type="submit" size="lg" className="w-full font-sinhala" loading={loading}>
            {uiText("ලියාපදිංචි වන්න | Register")}</Button>
        </form>

        <p className="mt-5 text-center font-sinhala text-sm text-forest">
          {uiText("දැනටමත් ගිණුමක් තිබේද?")}{' '}
          <Link to="/login" className="font-semibold text-amber">
            {uiText("ඇතුළු වන්න")}</Link>
        </p>

      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-light">
                <MapPin className="h-7 w-7 text-amber" />
              </div>
            </div>
            <h3 className="mb-2 text-center font-sinhala text-lg font-bold text-forest">
              {uiText("ස්ථාන අවසරය | Location Access")}</h3>
            <p className="mb-1 text-center font-sinhala text-sm text-forest-light">
              {uiText("දිස්ත්‍රික්කය හඳුනාගෙන දැඩි කාලගුණ තත්ත්ව ගැන දැනුම් දෙන්නද?")}</p>
            <p className="mb-5 text-center text-xs text-forest-muted">
              {uiText("Enable weather alerts for your district? Only your district name is saved — never exact GPS coordinates.")}</p>
            <div className="flex gap-3">
              <button
                onClick={handleSkipLocation}
                className="flex-1 rounded-xl border border-beige py-3 text-sm font-semibold text-forest-muted
                  hover:bg-beige transition-colors"
              >
                {uiText("දැන් නෙමේ | Skip")}</button>
              <button
                onClick={handleAllowLocation}
                disabled={locationLoading}
                className="flex-1 rounded-xl bg-amber py-3 text-sm font-bold text-white
                  hover:bg-amber-dark transition-colors disabled:opacity-60"
              >
                {locationLoading ? uiText("Locating...") : uiText("ඔව් | Allow")}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-forest-muted">
              {uiText("You can change this anytime in your profile settings.")}</p>
          </div>
        </div>
      )}
    </AuthSplitLayout>
  )
}
