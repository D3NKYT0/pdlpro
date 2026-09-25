import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from 'react'
import { themeApi, type ApiTheme } from '../services/api'
import { applyClassicLayoutArt, applyThemeSurfaceVars, configureRuntimeTheme } from './assets'
import { persistAppliedLoaderChrome } from './loaderChrome'
import { applyThemeChromeColors, applyThemeHeadIcons } from './themeHead'
import { applyThemeLocales } from './themeLocales'
import { resolveTemplateId } from './templates/resolve'

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

async function applyTheme(theme: ApiTheme) {
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
  activeThemeLink?.remove()
  activeThemeLink = null
  if (theme.stylesheet_url) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = installedStylesheetHref(theme.stylesheet_url, theme.version)
    link.dataset.pdlInstalledTheme = theme.id
    activeThemeLink = link
    const loaded = new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 5000)
      const finish = () => { window.clearTimeout(timeout); resolve() }
      link.addEventListener('load', finish, { once: true })
      link.addEventListener('error', finish, { once: true })
    })
    document.head.appendChild(link)
    await loaded
  }
  applyThemeHeadIcons(theme)
  applyThemeChromeColors(theme)
  persistAppliedLoaderChrome(theme.id)
  await applyThemeLocales(theme)
}

/** Mantém o CSS instalado depois das folhas estruturais adicionadas pelos layouts. */
export function reassertInstalledTheme() {
  if (activeThemeLink?.isConnected) document.head.appendChild(activeThemeLink)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ApiTheme | null>(null)

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      void Promise.resolve()
        .then(() => themeApi.active())
        .catch(() => DEFAULT_THEME)
        .then(async (resolved) => {
          await applyTheme(resolved)
          if (!cancelled) setTheme(resolved)
        })
    }
    refresh()
    window.addEventListener('pdl-theme-refresh', refresh)
    return () => {
      cancelled = true
      window.removeEventListener('pdl-theme-refresh', refresh)
    }
  }, [])

  if (!theme) {
    return <div className="theme-bootstrap" role="status" aria-label="Carregando aparência do site" />
  }
  return <ThemeContext.Provider value={theme}><Fragment key={theme.id}>{children}</Fragment></ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
