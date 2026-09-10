import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  detectBrowserLanguage,
  LANGUAGE_STORAGE_KEY,
  persistLanguage,
  readDjangoLanguageCookie,
  readStoredLanguage,
  type AppLanguage,
} from './locale'

import ptCommon from './locales/pt/common.json'
import ptPublic from './locales/pt/public.json'
import ptAuth from './locales/pt/auth.json'
import ptPanel from './locales/pt/panel.json'
import ptAdmin from './locales/pt/admin.json'
import ptHelp from './locales/pt/help.json'
import ptPersonality from './locales/pt/personality.json'

import enCommon from './locales/en/common.json'
import enPublic from './locales/en/public.json'
import enAuth from './locales/en/auth.json'
import enPanel from './locales/en/panel.json'
import enAdmin from './locales/en/admin.json'
import enHelp from './locales/en/help.json'
import enPersonality from './locales/en/personality.json'

import esCommon from './locales/es/common.json'
import esPublic from './locales/es/public.json'
import esAuth from './locales/es/auth.json'
import esPanel from './locales/es/panel.json'
import esAdmin from './locales/es/admin.json'
import esHelp from './locales/es/help.json'
import esPersonality from './locales/es/personality.json'

const initialLanguage: AppLanguage =
  import.meta.env.MODE === 'test'
    ? 'pt'
    : readStoredLanguage() || readDjangoLanguageCookie() || detectBrowserLanguage()

// Keep storage aligned with the active UI language so HTTP headers follow the SPA.
if (import.meta.env.MODE !== 'test') {
  persistLanguage(initialLanguage)
}

void i18n.use(initReactI18next).init({
  resources: {
    pt: { common: ptCommon, public: ptPublic, auth: ptAuth, panel: ptPanel, admin: ptAdmin, help: ptHelp, personality: ptPersonality },
    en: { common: enCommon, public: enPublic, auth: enAuth, panel: enPanel, admin: enAdmin, help: enHelp, personality: enPersonality },
    es: { common: esCommon, public: esPublic, auth: esAuth, panel: esPanel, admin: esAdmin, help: esHelp, personality: esPersonality },
  },
  lng: initialLanguage,
  fallbackLng: 'pt',
  defaultNS: 'common',
  ns: ['common', 'public', 'auth', 'panel', 'admin', 'help', 'personality'],
  interpolation: { escapeValue: false },
  returnNull: false,
})

i18n.on('languageChanged', (language) => {
  if (language === 'pt' || language === 'en' || language === 'es') {
    persistLanguage(language)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'pt' ? 'pt-BR' : language
    }
  }
})

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== LANGUAGE_STORAGE_KEY) return
    const next = event.newValue
    if (next === 'pt' || next === 'en' || next === 'es') {
      if (i18n.language !== next) {
        void i18n.changeLanguage(next)
      }
    }
  })
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage === 'pt' ? 'pt-BR' : initialLanguage
}

export default i18n
