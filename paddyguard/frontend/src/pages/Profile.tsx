import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { readProfile, updateProfile, uploadAvatar, removeAvatar, type Profile as ProfileData } from '@/lib/communityApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/api'
import { Avatar, QueryState, fieldClass, buttonClass, useBlobUrl } from '@/components/community/Common'

function ProfileForm({ profile }: { profile: ProfileData }) {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const [draft, setDraft] = useState(profile)
  const [file, setFile] = useState<File | null>(null)
  const preview = useBlobUrl(file)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  function reset() { setDraft(profile); setFile(null) }
  async function imageAction(remove = false) {
    setUploading(true)
    try { if (remove) await removeAvatar(); else if (file) await uploadAvatar(file); setFile(null); await client.invalidateQueries({ queryKey: ['avatar', profile.id] }); toast.success(t('saved')) }
    catch (error) { toast.error(getErrorMessage(error, t('error'))) }
    finally { setUploading(false) }
  }
  return <form className="space-y-6 rounded-2xl border border-beige bg-white p-5 md:p-8" onSubmit={async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { const updated = await updateProfile({ full_name: draft.full_name?.trim() || null, phone: draft.phone?.trim() || null, district: draft.district?.trim() || null, preferred_language: draft.preferred_language }); useAuthStore.getState().updateUser(updated); await i18n.changeLanguage(updated.preferred_language); client.setQueryData(['profile', profile.id], updated); toast.success(t('saved')) }
    catch (error) { toast.error(getErrorMessage(error, t('error'))) } finally { setBusy(false) }
  }}>
    <div className="flex flex-wrap items-center gap-5">{preview ? <img src={preview} alt={t("profile")} className="h-24 w-24 rounded-full object-cover" /> : <Avatar className="h-24 w-24" />}<div className="space-y-3"><label className="block text-sm text-forest">{t('upload')}<input className="mt-2 block max-w-full" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => { const selected = e.target.files?.[0]; e.target.value = ''; if (!selected) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 2 * 1024 * 1024 || selected.size === 0) { toast.error(t('invalidImage')); return }; setFile(selected) }} /></label><p className="text-xs text-forest-muted">{t('imageHelp')}</p><div className="flex gap-2"><button type="button" className={buttonClass} disabled={!file || uploading} onClick={() => void imageAction()}>{uploading ? t('loading') : t('save')}</button><button type="button" className={buttonClass} disabled={uploading} onClick={() => void imageAction(true)}>{t('remove')}</button></div></div></div>
    <div className="grid gap-5 md:grid-cols-2">{(['full_name', 'phone', 'district'] as const).map(key => <label key={key} className="text-sm text-forest">{t(key === 'full_name' ? 'fullName' : key)}<input className={`${fieldClass} mt-2`} value={draft[key] || ''} maxLength={key === 'full_name' ? 120 : key === 'phone' ? 24 : 80} type={key === 'phone' ? 'tel' : 'text'} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}<label className="text-sm text-forest">{t('email')}<input className={`${fieldClass} mt-2`} readOnly value={profile.email} /></label><label className="text-sm text-forest">{t('language')}<select className={`${fieldClass} mt-2`} value={draft.preferred_language} onChange={e => setDraft({ ...draft, preferred_language: e.target.value as 'si' | 'en' })}><option value="si">සිංහල</option><option value="en">English</option></select></label><div className="text-sm text-forest">{t('created')}<p className="mt-3">{new Date(profile.created_at).toLocaleDateString(i18n.language)}</p></div></div>
    <div className="flex gap-3"><button className={buttonClass} disabled={busy}>{busy ? t('loading') : t('save')}</button><button type="button" className={buttonClass} onClick={reset} disabled={busy}>{t('cancel')}</button></div>
  </form>
}
export default function Profile() {
  const { t } = useTranslation()
  const id = useAuthStore(s => s.user?.id)
  const query = useQuery({ queryKey: ['profile', id], queryFn: ({ signal }) => readProfile(signal) })
  return <div className="space-y-5"><h2 className="text-2xl font-bold text-forest">{t("profile")}</h2><QueryState loading={query.isPending} error={query.error} retry={() => void query.refetch()} />{!query.error && query.data && <ProfileForm key={query.data.id + query.data.full_name + query.data.preferred_language + query.data.phone + query.data.district} profile={query.data} />}</div>
}
