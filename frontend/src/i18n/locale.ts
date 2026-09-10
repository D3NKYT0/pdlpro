export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es'] as const
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_STORAGE_KEY = 'pdl.language'

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
}

/** Locale BCP 47 used by Intl formatters. */
export const INTL_LOCALES: Record<AppLanguage, string> = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es',
}

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'pt' || value === 'en' || value === 'es'
}

export function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'pt'
  const candidates = [...(navigator.languages || []), navigator.language]
  for (const raw of candidates) {
    const code = String(raw || '').toLowerCase()
    if (code.startsWith('pt')) return 'pt'
    if (code.startsWith('en')) return 'en'
    if (code.startsWith('es')) return 'es'
  }
  return 'pt'
}

export function readStoredLanguage(): AppLanguage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isAppLanguage(stored) ? stored : null
  } catch {
    return null
  }
}

export function persistLanguage(language: AppLanguage) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    /* ignore quota / private mode */
  }
}

/** Language code for content APIs (`?lang=`). */
export function contentLang(language: string): AppLanguage {
  return isAppLanguage(language) ? language : 'pt'
}

/** hCaptcha language codes. */
export function hcaptchaLanguage(language: string): string {
  if (language === 'en') return 'en'
  if (language === 'es') return 'es'
  return 'pt-BR'
}
