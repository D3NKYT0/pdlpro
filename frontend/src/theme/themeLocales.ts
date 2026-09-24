import i18n from '../i18n'
import type { AppLanguage } from '../i18n/locale'
import type { ApiTheme } from '../services/domain/theme.service'

export const THEME_LOCALE_NAMESPACES = [
  'common',
  'public',
  'auth',
  'panel',
  'admin',
  'help',
  'personality',
] as const

export type ThemeLocaleNamespace = (typeof THEME_LOCALE_NAMESPACES)[number]

const LANGUAGES: AppLanguage[] = ['pt', 'en', 'es']

type LocaleBundle = Record<string, unknown>
type LocaleCatalog = Partial<Record<ThemeLocaleNamespace, LocaleBundle>>

const baseCatalogs: Record<AppLanguage, Record<ThemeLocaleNamespace, LocaleBundle>> = {
  pt: {} as Record<ThemeLocaleNamespace, LocaleBundle>,
  en: {} as Record<ThemeLocaleNamespace, LocaleBundle>,
  es: {} as Record<ThemeLocaleNamespace, LocaleBundle>,
}

let baseCaptured = false
let appliedThemeId: string | null = null
let appliedUrlsKey = ''

function captureBaseCatalogs() {
  if (baseCaptured) return
  for (const language of LANGUAGES) {
    for (const ns of THEME_LOCALE_NAMESPACES) {
      const bundle = i18n.getResourceBundle(language, ns)
      baseCatalogs[language][ns] = bundle && typeof bundle === 'object'
        ? structuredClone(bundle)
        : {}
    }
  }
  baseCaptured = true
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function deepMergeLocale(base: unknown, overlay: unknown): unknown {
  if (Array.isArray(overlay)) return overlay.slice()
  if (typeof overlay === 'string') return overlay
  if (!isPlainObject(overlay)) return base
  const root = isPlainObject(base) ? { ...base } : {}
  for (const [key, value] of Object.entries(overlay)) {
    root[key] = deepMergeLocale(root[key], value)
  }
  return root
}

function restoreBaseCatalogs() {
  captureBaseCatalogs()
  for (const language of LANGUAGES) {
    for (const ns of THEME_LOCALE_NAMESPACES) {
      if (i18n.hasResourceBundle(language, ns)) {
        i18n.removeResourceBundle(language, ns)
      }
      i18n.addResourceBundle(language, ns, structuredClone(baseCatalogs[language][ns]), true, true)
    }
  }
}

function applyCatalog(language: AppLanguage, catalog: LocaleCatalog) {
  for (const ns of THEME_LOCALE_NAMESPACES) {
    const overlay = catalog[ns]
    if (!overlay || !isPlainObject(overlay)) continue
    const merged = deepMergeLocale(baseCatalogs[language][ns], overlay)
    i18n.addResourceBundle(language, ns, merged as LocaleBundle, true, true)
  }
}

function sanitizeCatalog(raw: unknown): LocaleCatalog {
  if (!isPlainObject(raw)) return {}
  const catalog: LocaleCatalog = {}
  for (const ns of THEME_LOCALE_NAMESPACES) {
    const bundle = raw[ns]
    if (isPlainObject(bundle)) catalog[ns] = bundle
  }
  return catalog
}

async function fetchCatalog(url: string): Promise<LocaleCatalog> {
  const response = await fetch(url, { credentials: 'same-origin' })
  if (!response.ok) return {}
  try {
    return sanitizeCatalog(await response.json())
  } catch {
    return {}
  }
}

function urlsKey(locales: ApiTheme['locales']): string {
  if (!locales) return ''
  return LANGUAGES.map((language) => `${language}:${locales[language] || ''}`).join('|')
}

/** Restaura os catálogos embutidos e aplica overlays JSON do tema ativo. */
export async function applyThemeLocales(theme: Pick<ApiTheme, 'id' | 'locales'>) {
  captureBaseCatalogs()
  const nextKey = urlsKey(theme.locales)
  if (theme.id === appliedThemeId && nextKey === appliedUrlsKey) return

  restoreBaseCatalogs()
  appliedThemeId = theme.id
  appliedUrlsKey = nextKey

  if (!theme.locales) return

  await Promise.all(
    LANGUAGES.map(async (language) => {
      const url = theme.locales?.[language]
      if (!url) return
      const catalog = await fetchCatalog(url)
      applyCatalog(language, catalog)
    }),
  )
}

/** Utilitário de teste: limpa o estado do overlay. */
export function resetThemeLocaleStateForTests() {
  appliedThemeId = null
  appliedUrlsKey = ''
  baseCaptured = false
}
