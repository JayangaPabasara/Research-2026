import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { readAvatar } from '@/lib/communityApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/api'
import axios from 'axios'

export const fieldClass = 'w-full rounded-xl border border-beige bg-white p-3 text-sm text-forest focus:ring-2 focus:ring-amber outline-none'
export const buttonClass = 'rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-forest-light'
export function QueryState({ loading, error, retry }: { loading?: boolean; error?: unknown; retry?: () => void }) {
  const { t } = useTranslation()
  if (loading) return <p role="status" className="p-4 text-forest-muted">{t('loading')}</p>
  if (!error) return null
  return <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{axios.isAxiosError(error) && error.response?.status === 403 ? t('forbidden') : getErrorMessage(error, t('error'))} {retry && <button className="underline" onClick={retry}>{t('retry')}</button>}</div>
}
export function Pagination({ offset, total, limit = 20, onChange }: { offset: number; total: number; limit?: number; onChange: (offset: number) => void }) {
  const { t } = useTranslation()
  return <div className="flex flex-wrap items-center justify-between gap-3 py-4"><span className="text-sm text-forest-muted">{t('total')}: {total}</span><div className="flex gap-2"><button className={buttonClass} disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>{t('previous')}</button><button className={buttonClass} disabled={offset + limit >= total || offset + limit > 100000} onClick={() => onChange(offset + limit)}>{t('next')}</button></div></div>
}
export function Avatar({ className = 'h-10 w-10' }: { className?: string }) {
  const user = useAuthStore(s => s.user)
  const authed = useAuthStore(s => s.isAuthenticated)
  const query = useQuery({ queryKey: ['avatar', user?.id], queryFn: ({ signal }) => readAvatar(signal), enabled: authed && !!user?.id, retry: false })
  const blob = query.data
  // The object URL belongs to this mounted image and is revoked on replacement/unmount.
  const url = useBlobUrl(blob)
  return url ? <img src={url} alt="" className={`${className} shrink-0 rounded-full object-cover`} /> : <span className={`${className} flex shrink-0 items-center justify-center rounded-full bg-amber text-white`}>{(user?.full_name || user?.email || 'P').charAt(0).toUpperCase()}</span>
}
export function useBlobUrl(blob?: Blob | null) {
  const [url, setUrl] = useState<string>()
  useEffect(() => { if (!blob) { setUrl(undefined); return }; const value = URL.createObjectURL(blob); setUrl(value); return () => URL.revokeObjectURL(value) }, [blob])
  return url
}
