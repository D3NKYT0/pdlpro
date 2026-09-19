import { themeImage } from './assets'

export const LOADER_CHROME_STORAGE_KEY = 'pdl.loaderChrome'

export type LoaderChrome = {
  id: string
  symbol: string
  logo?: string
  accent: string
  accentBright: string
  background: string
}

export const DEFAULT_LOADER_CHROME: LoaderChrome = {
  id: 'default',
  symbol: '/theme/default/images/pdl-symbol.svg',
  logo: '/theme/default/images/logo.png',
  accent: '#d4ad62',
  accentBright: '#e0bd72',
  background: '#080705',
}

const THEME_ID = /^[a-z0-9][a-z0-9._-]{0,40}$/i
const SYMBOL = /^\/(?:theme|media\/themes)\/[A-Za-z0-9._/-]+$/
const COLOR =
  /^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(|hsla?\(|oklch\(|oklab\(|hwb\(|color\()/i

export function isLoaderColor(value: string) {
  const color = value.trim()
  if (!color || /[;{}]|url\s*\(|expression|<\/|"|'/i.test(color)) return false
  return COLOR.test(color)
}

export function isLoaderSymbol(value: string) {
  return SYMBOL.test(value) && !value.includes('..')
}

export function sanitizeLoaderChrome(value: unknown): LoaderChrome | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || !THEME_ID.test(row.id)) return null
  if (typeof row.symbol !== 'string' || !isLoaderSymbol(row.symbol)) return null
  if (row.logo != null && (typeof row.logo !== 'string' || !isLoaderSymbol(row.logo))) return null
  if (typeof row.accent !== 'string' || !isLoaderColor(row.accent)) return null
  if (typeof row.accentBright !== 'string' || !isLoaderColor(row.accentBright)) return null
  if (typeof row.background !== 'string' || !isLoaderColor(row.background)) return null
  return {
    id: row.id,
    symbol: row.symbol,
    logo: typeof row.logo === 'string' ? row.logo : undefined,
    accent: row.accent.trim(),
    accentBright: row.accentBright.trim(),
    background: row.background.trim(),
  }
}

export function readLoaderChrome(): LoaderChrome | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOADER_CHROME_STORAGE_KEY)
    return raw ? sanitizeLoaderChrome(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function writeLoaderChrome(chrome: LoaderChrome) {
  const safe = sanitizeLoaderChrome(chrome)
  if (!safe || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LOADER_CHROME_STORAGE_KEY, JSON.stringify(safe))
  } catch {
    /* quota / private mode */
  }
}

export function applyLoaderChrome(chrome: LoaderChrome) {
  const safe = sanitizeLoaderChrome(chrome)
  if (!safe) return
  const root = document.documentElement
  root.style.setProperty('--loader-accent', safe.accent)
  root.style.setProperty('--loader-accent-bright', safe.accentBright)
  root.style.setProperty('--loader-bg', safe.background)
  root.dataset.pdlLoaderTheme = safe.id
  const mark =
    document.querySelector<HTMLImageElement>('#app-bootstrap-loader .global-loader__crest img') ??
    document.querySelector<HTMLImageElement>('#app-bootstrap-loader img:not(.global-loader__wordmark)')
  if (mark && mark.getAttribute('src') !== safe.symbol) mark.src = safe.symbol
  const wordmark = document.querySelector<HTMLImageElement>('#app-bootstrap-loader .global-loader__wordmark')
  if (wordmark && safe.logo && wordmark.getAttribute('src') !== safe.logo) wordmark.src = safe.logo
}

function readThemeColor(name: string, fallback: string) {
  const computed = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (isLoaderColor(computed)) return computed
  const inline = document.documentElement.style.getPropertyValue(name).trim()
  return isLoaderColor(inline) ? inline : fallback
}

export function captureLoaderChrome(themeId: string): LoaderChrome {
  const id = THEME_ID.test(themeId) ? themeId : DEFAULT_LOADER_CHROME.id
  const pinDefaultAccent = id === DEFAULT_LOADER_CHROME.id
  const symbol = themeImage('pdl-symbol.svg')
  const logo = themeImage('logo.png')
  return {
    id,
    symbol: isLoaderSymbol(symbol) ? symbol : DEFAULT_LOADER_CHROME.symbol,
    logo: isLoaderSymbol(logo) ? logo : DEFAULT_LOADER_CHROME.logo,
    accent: pinDefaultAccent
      ? DEFAULT_LOADER_CHROME.accent
      : readThemeColor('--theme-accent', DEFAULT_LOADER_CHROME.accent),
    accentBright: pinDefaultAccent
      ? DEFAULT_LOADER_CHROME.accentBright
      : readThemeColor('--theme-accent-bright', DEFAULT_LOADER_CHROME.accentBright),
    background: pinDefaultAccent
      ? DEFAULT_LOADER_CHROME.background
      : readThemeColor('--theme-bg-deep', DEFAULT_LOADER_CHROME.background),
  }
}

/** Grava o chrome do tema ativo e pinta o splash HTML se ele ainda estiver na tela. */
export function persistAppliedLoaderChrome(themeId: string) {
  const chrome = captureLoaderChrome(themeId)
  writeLoaderChrome(chrome)
  applyLoaderChrome(chrome)
}

export function applyCachedLoaderChrome() {
  const cached = readLoaderChrome()
  if (cached) applyLoaderChrome(cached)
}
