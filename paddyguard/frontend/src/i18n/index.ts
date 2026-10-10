import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import si from './si'
import { uiEn, uiSi } from './ui'
import { enhancementEn, enhancementSi } from './enhancements'
void i18n.use(initReactI18next).init({ resources: { en: { translation: { ...en, ...enhancementEn, ui: uiEn } }, si: { translation: { ...si, ...enhancementSi, ui: uiSi } } }, lng: localStorage.getItem('paddyguard_language') === 'en' ? 'en' : 'si', fallbackLng: 'en', interpolation: { escapeValue: false } })
i18n.on('languageChanged', language => { document.documentElement.lang = language; localStorage.setItem('paddyguard_language', language) })
document.documentElement.lang = i18n.language
export default i18n
