import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from 'react'
import { themeApi, type ApiTheme } from '../services/api'
import { applyClassicLayoutArt, applyThemeSurfaceVars, configureRuntimeTheme } from './assets'
import { persistAppliedLoaderChrome } from './loaderChrome'
import { applyThemeChromeColors, applyThemeHeadIcons } from './themeHead'
import { applyThemeLocales } from './themeLocales'
import { resolveTemplateId } from './templates/resolve'
import { useTranslation } from 'react-i18next'

const DEFAULT_THEME: ApiTheme = {
  id: 'default', package_id: null, name: 'PDL Classic', version: '2.0.0', author: 'PDL',
  description: 'Visual clássico do PDL PRO — Aden, tipografia e a identidade original.', active: true, builtin: true,
  base_url: '/theme/default/', stylesheet_url: null, assets: {}, presentation: null, layout: null, metadata: null,
  locales: null,
}

const ThemeContext = createContext<ApiTheme>(DEFAULT_THEME)
let activeThemeLink: HTMLLinkElement | null = null

const INSTALLED_STYLE_REV = 'bg16'

export function installedStylesheetHref(url: string, version: string) {
  const bust = `${version.trim() || '1'}.${INSTALLED_STYLE_REV}`
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(bust)}`
}

async function applyTheme(theme: ApiTheme, signal: AbortSignal) {
  // Keep the previous stylesheet until the replacement is confirmed usable.
  let replacement: HTMLLinkElement | null = null
  if (theme.stylesheet_url) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = installedStylesheetHref(theme.stylesheet_url, theme.version)
    link.dataset.pdlInstalledTheme = theme.id
    replacement = link
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        window.clearTimeout(timeout)
        link.removeEventListener('load', loaded)
        link.removeEventListener('error', failed)
        signal.removeEventListener('abort', aborted)
        if (error) { link.remove(); reject(error) } else resolve()
      }
      const loaded = () => {
        try {
          if (link.sheet?.cssRules.length) { finish(); return }
        } catch { /* Installed package stylesheets must be readable on this origin. */ }
        failed()
      }
      const failed = () => finish(new Error('Theme stylesheet unavailable'))
      const aborted = () => finish(new Error('Theme loading cancelled'))
      const timeout = window.setTimeout(failed, 5000)
      link.addEventListener('load', loaded)
      link.addEventListener('error', failed)
      signal.addEventListener('abort', aborted, { once: true })
      document.head.appendChild(link)
      if (signal.aborted) aborted()
    })
  }
  if (signal.aborted) { replacement?.remove(); return }
  await applyThemeLocales(theme)
  if (signal.aborted) { replacement?.remove(); return }
  activeThemeLink?.remove()
  activeThemeLink = replacement
  const templateId = resolveTemplateId(theme.selected_template || theme.presentation?.renderer)
  const classicSlots: Record<string, string> = {}
  if (theme.id === 'default' && templateId) {
    classicSlots['images/cta-banner.jpg'] = `/theme/default/images/bg/${templateId}-cta.webp`
  }
  configureRuntimeTheme({ ...theme.assets, ...classicSlots })
  applyThemeSurfaceVars(theme.layout)
  applyClassicLayoutArt(theme.id, templateId)
  document.documentElement.dataset.pdlTheme = theme.id
  if (templateId) document.documentElement.dataset.pdlTemplate = templateId
  else delete document.documentElement.dataset.pdlTemplate
  if (theme.presentation?.renderer) {
    document.documentElement.dataset.pdlRenderer = theme.presentation.renderer
  } else {
    delete document.documentElement.dataset.pdlRenderer
  }
  applyThemeHeadIcons(theme)
  applyThemeChromeColors(theme)
  persistAppliedLoaderChrome(theme.id)
}

/** Mantém o CSS instalado depois das folhas estruturais adicionadas pelos layouts. */
export function reassertInstalledTheme() {
  if (activeThemeLink?.isConnected) document.head.appendChild(activeThemeLink)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const [theme, setTheme] = useState<ApiTheme | null>(null)

  useEffect(() => {
    let controller: AbortController | null = null
    let retry: number | undefined
    const refresh = () => {
      controller?.abort()
      window.clearTimeout(retry)
      const pending = new AbortController()
      controller = pending
      const attempt = async () => {
        try {
          const resolved = await themeApi.active()
          if (pending.signal.aborted) return
          await applyTheme(resolved, pending.signal)
          if (!pending.signal.aborted) setTheme(resolved)
        } catch {
          if (!pending.signal.aborted) retry = window.setTimeout(() => void attempt(), 2000)
        }
      }
      void attempt()
    }
    refresh()
    window.addEventListener('pdl-theme-refresh', refresh)
    return () => {
      controller?.abort()
      window.clearTimeout(retry)
      window.removeEventListener('pdl-theme-refresh', refresh)
    }
  }, [])

  if (!theme) {
    return <div className="theme-bootstrap" role="status" aria-label={t('loadingApp')}>{t('loading')}</div>
  }
  return <ThemeContext.Provider value={theme}><Fragment key={theme.id}>{children}</Fragment></ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
