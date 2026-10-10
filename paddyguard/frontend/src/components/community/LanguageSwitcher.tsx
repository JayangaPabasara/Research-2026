import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { updateProfile, type Language } from '@/lib/communityApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/api'
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const [saving, setSaving] = useState(false)
  async function change(language: Language) {
    if (saving) return
    const previous = i18n.language
    await i18n.changeLanguage(language)
    if (!useAuthStore.getState().isAuthenticated) return
    setSaving(true)
    try {
      const profile = await updateProfile({ preferred_language: language })
      useAuthStore.getState().updateUser(profile)
      client.setQueryData(['profile', profile.id], profile)
      client.setQueryData(['sessionIdentity', profile.id, true], profile)
    }
    catch (error) { await i18n.changeLanguage(previous); toast.error(getErrorMessage(error, t('error'))) }
    finally { setSaving(false) }
  }
  return <div className="flex shrink-0 gap-1 text-xs" aria-label={t('language')}>{(['si', 'en'] as const).map(language => <button key={language} disabled={saving} aria-pressed={i18n.language === language} onClick={() => void change(language)} className={`rounded-lg px-2 py-2 ${i18n.language === language ? 'bg-forest text-white' : 'text-forest hover:bg-beige'}`}>{language === 'si' ? 'සිංහල' : 'English'}</button>)}</div>
}
