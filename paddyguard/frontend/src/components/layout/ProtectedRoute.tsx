import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getLeafAuth } from '@/lib/leafApi'
import { useQuery } from '@tanstack/react-query'
import { readProfile } from '@/lib/communityApi'
import { QueryState } from '@/components/community/Common'

export type AppRole = 'FARMER' | 'EXPERT' | 'SUPER_ADMIN'

export function defaultRouteFor(): string {
  const leafAuth = getLeafAuth()
  if (leafAuth?.role === 'SUPER_ADMIN') return '/dashboard'
  if (leafAuth?.role === 'EXPERT') return '/expert-review'
  if (useAuthStore.getState().identityVerified && useAuthStore.getState().user?.role === 'SYSTEM_ADMIN') return '/system-admin'
  if (useAuthStore.getState().isAuthenticated) return '/'
  return '/login'
}

interface ProtectedRouteProps {
  allow: AppRole[]
  children: ReactNode
}

export default function ProtectedRoute({ allow, children }: ProtectedRouteProps) {
  const farmerAuthed = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore(s => s.user?.role)
  const verified = useAuthStore(s => s.identityVerified)
  const id = useAuthStore(s => s.user?.id)
  const identity = useQuery({ queryKey: ['sessionIdentity', id, farmerAuthed], queryFn: ({ signal }) => readProfile(signal), enabled: farmerAuthed, retry: false })
  const leafAuth = getLeafAuth()
  const leafRole = leafAuth?.role
  if (farmerAuthed && !verified && !leafRole) return <QueryState loading={identity.isPending} error={identity.error} retry={() => void identity.refetch()} />

  const granted =
    (allow.includes('FARMER') && farmerAuthed && (!verified || role === 'FARMER')) ||
    (allow.includes('EXPERT') && (leafRole === 'EXPERT' || leafRole === 'SUPER_ADMIN')) ||
    (allow.includes('SUPER_ADMIN') && leafRole === 'SUPER_ADMIN')

  if (!granted) {
    if (!farmerAuthed && !leafAuth) return <Navigate to="/login" replace />
    return <Navigate to={defaultRouteFor()} replace />
  }

  return <>{children}</>
}
