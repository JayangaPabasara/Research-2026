import { uiText } from '@/i18n/text'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { overview, farmers, farmer, adminFeedback, moderate, deleteFeedback, transitions, categories, statuses, type FeedbackFilters, type Category, type ModerationStatus } from '@/lib/communityApi'
import { getErrorMessage } from '@/lib/api'
import { QueryState, Pagination, fieldClass, buttonClass } from '@/components/community/Common'
import ActivityTable from '@/components/community/ActivityTable'

function OverviewPanel() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['adminOverview'], queryFn: ({ signal }) => overview(signal) })
  return <div className="space-y-6"><QueryState loading={query.isPending} error={query.error} retry={() => void query.refetch()} />{!query.error && query.data && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(query.data).map(([key, value]) => <article key={key} className="rounded-2xl border border-beige bg-white p-6"><p className="text-sm text-forest-muted">{t(key === 'testimonials' ? 'testimonialsCount' : key)}</p><p className="mt-2 text-3xl font-bold text-forest">{value}</p></article>)}</div>}<ActivityTable admin /></div>
}
function FarmerDetails({ id, close }: { id: string; close: () => void }) {
  const { t, i18n } = useTranslation()
  const query = useQuery({ queryKey: ['adminFarmer', id], queryFn: ({ signal }) => farmer(id, signal) })
  return <section className="space-y-5 rounded-2xl border border-beige bg-white p-5"><button className={buttonClass} onClick={close}>{t('close')}</button><QueryState loading={query.isPending} error={query.error} retry={() => void query.refetch()} />{!query.error && query.data && <dl className="grid gap-4 sm:grid-cols-2">{(['full_name', 'email', 'phone', 'district', 'created_at'] as const).map(key => <div key={key}><dt className="text-sm text-forest-muted">{t(key === 'full_name' ? 'fullName' : key === 'created_at' ? 'created' : key)}</dt><dd className="break-words text-forest">{key === 'created_at' ? new Date(query.data[key]).toLocaleString(i18n.language) : query.data[key] || '—'}</dd></div>)}</dl>}<ActivityTable admin userId={id} /></section>
}
function FarmerPanel() {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string>()
  const query = useQuery({ queryKey: ['adminFarmers', applied, offset], queryFn: ({ signal }) => farmers({ search: applied || undefined, offset, limit: 20 }, signal) })
  return <div className="space-y-5"><form className="flex gap-3" onSubmit={e => { e.preventDefault(); setApplied(search.trim()); setOffset(0) }}><input aria-label={t('search')} className={fieldClass} maxLength={120} value={search} onChange={e => setSearch(e.target.value)} /><button className={buttonClass}>{t('search')}</button></form><QueryState loading={query.isPending} error={query.error} retry={() => void query.refetch()} />{!query.error && query.data && <><div className="overflow-x-auto rounded-xl bg-white"><table className="w-full text-left text-sm"><thead className="bg-beige"><tr>{['fullName', 'email', 'created', 'details'].map(key => <th className="p-3" key={key}>{t(key)}</th>)}</tr></thead><tbody>{query.data.items.map(item => <tr key={item.id} className="border-t border-beige"><td className="p-3">{item.full_name || '—'}</td><td className="p-3">{item.email}</td><td className="whitespace-nowrap p-3">{new Date(item.created_at).toLocaleDateString(i18n.language)}</td><td className="p-3"><button className={buttonClass} onClick={() => setSelected(item.id)}>{t('details')}</button></td></tr>)}</tbody></table></div>{!query.data.items.length && <p>{t('empty')}</p>}<Pagination total={query.data.total} offset={offset} onChange={setOffset} /></>}{selected && <FarmerDetails key={selected} id={selected} close={() => setSelected(undefined)} />}</div>
}
function FeedbackPanel() {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const [filters, setFilters] = useState<FeedbackFilters>({ offset: 0, limit: 20 })
  const [busy, setBusy] = useState<string>()
  const [deleting, setDeleting] = useState<string>()
  const query = useQuery({ queryKey: ['adminFeedback', filters], queryFn: ({ signal }) => adminFeedback(filters, signal) })
  async function mutate(id: string, status?: ModerationStatus) {
    if (busy) return
    setBusy(id)
    try { if (status) await moderate(id, status); else await deleteFeedback(id); setDeleting(undefined); await Promise.all([client.invalidateQueries({ queryKey: ['adminFeedback'] }), client.invalidateQueries({ queryKey: ['adminOverview'] }), client.invalidateQueries({ queryKey: ['activity'] }), client.invalidateQueries({ queryKey: ['testimonials'] })]); toast.success(t('saved')) }
    catch (error) { toast.error(getErrorMessage(error, t('error'))); await query.refetch() } finally { setBusy(undefined) }
  }
  return <div className="space-y-5"><p className="rounded-xl bg-amber/10 p-4 text-sm text-forest">{t('reviewHelp')}</p><div className="grid gap-3 sm:grid-cols-3"><label>{t('status')}<select className={fieldClass} value={filters.status || ''} onChange={e => setFilters({ ...filters, offset: 0, status: e.target.value as ModerationStatus || undefined })}><option value="">{t('all')}</option>{statuses.map(v => <option key={v} value={v}>{t(v)}</option>)}</select></label><label>{t('category')}<select className={fieldClass} value={filters.category || ''} onChange={e => setFilters({ ...filters, offset: 0, category: e.target.value as Category || undefined })}><option value="">{t('all')}</option>{categories.map(v => <option key={v} value={v}>{t(v)}</option>)}</select></label><label>{t('rating')}<select className={fieldClass} value={filters.rating || ''} onChange={e => setFilters({ ...filters, offset: 0, rating: Number(e.target.value) || undefined })}><option value="">{t('all')}</option>{[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}{v <= 3 ? ` · ${t('negative')}` : ''}</option>)}</select></label></div><QueryState loading={query.isPending} error={query.error} retry={() => void query.refetch()} />{!query.error && query.data && <><div className="space-y-4">{query.data.items.map(item => <article className="space-y-3 rounded-2xl border border-beige bg-white p-5" key={item.id}><p className="text-sm text-forest-muted">{'★'.repeat(item.rating)} · {t(item.category)} · {t(item.status)} · {new Date(item.created_at).toLocaleString(i18n.language)}</p><p className="break-words font-mono text-xs text-forest-muted">{t('farmers')}: {item.user_id}</p><p className="whitespace-pre-wrap break-words text-forest">{item.message}</p><p className="text-xs">{t('publicConsent')}: {t(item.consent_public ? 'yes' : 'no')}</p><div className="flex flex-wrap gap-2">{transitions(item).map(status => <button className={buttonClass} key={status} disabled={!!busy} onClick={() => void mutate(item.id, status)}>{t(status)}</button>)}<button className="rounded-xl border border-red-300 px-4 py-2 text-sm text-red-700" disabled={!!busy} onClick={() => setDeleting(item.id)}>{t('delete')}</button></div>{deleting === item.id && <div role="alertdialog" aria-label={t('deleteConfirm')} className="rounded-xl bg-red-50 p-4"><p>{t('deleteConfirm')}</p><div className="mt-3 flex gap-3"><button autoFocus className={buttonClass} disabled={!!busy} onClick={() => setDeleting(undefined)}>{t('cancel')}</button><button className={buttonClass} disabled={!!busy} onClick={() => void mutate(item.id)}>{t('delete')}</button></div></div>}</article>)}</div>{!query.data.items.length && <p>{t('empty')}</p>}<Pagination total={query.data.total} offset={filters.offset || 0} onChange={offset => setFilters({ ...filters, offset })} /></>}</div>
}
export default function SystemAdmin() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('overview')
  return <div className="space-y-6"><h2 className="text-2xl font-bold text-forest">{t('systemAdmin')}</h2><nav className="flex flex-wrap gap-2" aria-label={t('systemAdmin')}>{['overview', 'farmers', uiText("feedback"), 'activity'].map(value => <button key={value} onClick={() => setTab(value)} aria-current={tab === value ? 'page' : undefined} className={`${buttonClass} ${tab === value ? 'ring-2 ring-amber' : ''}`}>{t(value)}</button>)}</nav>{tab === 'overview' ? <OverviewPanel /> : tab === 'farmers' ? <FarmerPanel /> : tab === 'feedback' ? <FeedbackPanel /> : <ActivityTable admin />}</div>
}
