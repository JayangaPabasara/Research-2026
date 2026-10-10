import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/community/LanguageSwitcher'
export { LanguageSwitcher }
export function useLeafLanguage(): 'en' | 'si' {
  const { i18n } = useTranslation()
  return i18n.language === 'en' ? 'en' : 'si'
}
