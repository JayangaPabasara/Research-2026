import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { readProfile } from '@/lib/communityApi'
import { useAuthStore } from '@/store/authStore'
import { QueryState } from '@/components/community/Common'
export default function SystemAdminGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const token = useAuthStore(s => s.accessToken)
  const query = useQuery({ queryKey: ['adminIdentity', token], queryFn: ({ signal }) => readProfile(signal), enabled: !!token, retry: false, staleTime: 0, refetchOnMount: 'always' })
  useEffect(() => { if (query.data) useAuthStore.getState().updateUser(query.data) }, [query.data])
  if (!token) return <Navigate to="/system-admin-login" replace />
  if (query.isFetching || query.isPending || query.error) return <div className="p-6"><QueryState loading={query.isFetching || query.isPending} error={query.error} retry={() => void query.refetch()} /></div>
  if (query.data?.role !== 'SYSTEM_ADMIN' || !query.data.is_active) return <div role="alert" className="p-6 text-red-700">{t('unauthorized')}</div>
  return <>{children}</>
}
