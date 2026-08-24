import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wheat } from 'lucide-react'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { register, getProfile } from '@/lib/authApi'
import { ensureLeafSession } from '@/lib/leafApi'
import { useAuthStore } from '@/store/authStore'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const tokens = await register(email, password, fullName || undefined)
      setAuth({ id: '', email, full_name: fullName || null, role: 'FARMER' }, tokens.access_token, tokens.refresh_token)

      const profile = await getProfile()
      setAuth({ id: profile.id, email: profile.email, full_name: profile.full_name, role: 'FARMER' }, tokens.access_token, tokens.refresh_token)

      ensureLeafSession(email, password, fullName || undefined)
      navigate('/')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest">
          <Wheat className="h-7 w-7 text-amber" />
        </div>
        <h1 className="text-2xl font-bold text-forest">PaddyGuard AI</h1>
        <p className="font-sinhala text-sm text-forest-muted">නව ගිණුමක් සාදන්න</p>
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-6 font-sinhala text-xl font-bold text-forest">ලියාපදිංචි වන්න</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="සම්පූර්ණ නම | Full Name"
            sinhalaLabel
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="විද්‍යුත් තැපෑල | Email"
            sinhalaLabel
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="මුරපදය | Password"
            sinhalaLabel
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="මුරපදය තහවුරු කරන්න | Confirm Password"
            sinhalaLabel
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && <p className="rounded-xl bg-red-soft/10 px-4 py-2 text-sm text-red-soft">{error}</p>}

          <Button type="submit" size="lg" className="w-full font-sinhala" loading={loading}>
            ලියාපදිංචි වන්න | Register
          </Button>
        </form>

        <p className="mt-5 text-center font-sinhala text-sm text-forest">
          දැනටමත් ගිණුමක් තිබේද?{' '}
          <Link to="/login" className="font-semibold text-amber">
            ඇතුළු වන්න
          </Link>
        </p>
      </div>
    </div>
  )
}
