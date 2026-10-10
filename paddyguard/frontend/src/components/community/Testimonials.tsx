import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { testimonials } from '@/lib/communityApi'
import { QueryState } from './Common'
export default function Testimonials() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['testimonials'], queryFn: ({ signal }) => testimonials({ limit: 6 }, signal) })
  return <section className="mt-8 space-y-4"><h2 className="text-2xl font-bold text-forest">{t('testimonials')}</h2><QueryState loading={query.isPending} error={query.error} retry={() => void query.refetch()} />{!query.error && query.data && (query.data.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.items.map(item => <article className="rounded-2xl border border-beige bg-white p-6 shadow-sm" key={item.id}><p className="text-amber" aria-label={`${t('rating')}: ${item.rating}`}>{'★'.repeat(item.rating)}</p><blockquote className="my-4 whitespace-pre-wrap break-words text-forest">{item.message}</blockquote><p className="font-semibold text-forest">{t('anonymous')}</p><p className="text-xs text-forest-muted">{t(item.category)}</p></article>)}</div> : <p className="rounded-xl bg-white p-5 text-forest-muted">{t('empty')}</p>)}</section>
}
