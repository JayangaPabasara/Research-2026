import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { categories, ownFeedback, submitFeedback, type Category } from '@/lib/communityApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/api'
import { Pagination, QueryState, fieldClass, buttonClass } from '@/components/community/Common'
export default function Feedback() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const id = useAuthStore(s => s.user?.id)
  const [rating, setRating] = useState(5)
  const [category, setCategory] = useState<Category>('GENERAL')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [offset, setOffset] = useState(0)
  const query = useQuery({ queryKey: ['ownFeedback', id, offset], queryFn: ({ signal }) => ownFeedback({ offset, limit: 20 }, signal) })
  return <div className="space-y-6"><h2 className="text-2xl font-bold text-forest">{t("feedback")}</h2><form className="space-y-5 rounded-2xl border border-beige bg-white p-6" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); try { await submitFeedback({ rating, category, message: message.trim(), consent_public: consent }); setMessage(''); setConsent(false); setOffset(0); await client.invalidateQueries({ queryKey: ['ownFeedback', id] }); toast.success(t('submitted')) } catch (error) { toast.error(getErrorMessage(error, t('error'))) } finally { setBusy(false) } }}>
  <fieldset><legend className="mb-2 text-sm text-forest">{t('rating')}</legend><div className="flex gap-2">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} aria-label={`${t('rating')}: ${value}`} aria-pressed={value === rating} onClick={() => setRating(value)} className="rounded-lg p-2 focus:ring-2 focus:ring-forest"><Star className={value <= rating ? 'fill-amber text-amber' : 'text-forest-muted'} /></button>)}</div></fieldset>
  <label className="block text-sm text-forest">{t('category')}<select className={`${fieldClass} mt-2`} value={category} onChange={e => setCategory(e.target.value as Category)}>{categories.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
  <label className="block text-sm text-forest">{t('message')}<textarea className={`${fieldClass} mt-2 min-h-32`} required maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} /></label>
  <label className="flex items-start gap-3 text-sm text-forest"><input className="mt-1" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{t('consent')}</label><p className="text-sm text-forest-muted">{t('moderationHelp')}</p><button className={buttonClass} disabled={busy || !message.trim()}>{busy ? t('loading') : t('submit')}</button></form>
  <h3 className="text-lg font-bold text-forest">{t('myFeedback')}</h3><QueryState loading={query.isPending} error={query.error} retry={() => void query.refetch()} />{!query.error && query.data && <><div className="grid gap-4 md:grid-cols-2">{query.data.items.map(item => <article key={item.id} className="rounded-xl border border-beige bg-white p-5"><p className="text-sm text-forest-muted">{'★'.repeat(item.rating)} · {t(item.category)} · {t(item.status)}</p><p className="mt-3 whitespace-pre-wrap break-words text-forest">{item.message}</p></article>)}</div>{!query.data.items.length && <p>{t('empty')}</p>}<Pagination offset={offset} total={query.data.total} onChange={setOffset} /></>}</div>
}
