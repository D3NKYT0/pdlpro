import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from 'react'
import { themeApi, type ApiTheme } from '../services/api'
import { configureRuntimeTheme } from './assets'

const DEFAULT_THEME: ApiTheme = {
  id: 'default', package_id: null, name: 'PDL Default', version: '2.0.0', author: 'PDL',
  description: 'Tema original preservado do PDL PRO.', active: true, builtin: true,
  base_url: '/theme/default/', stylesheet_url: null, assets: {}, presentation: null,
}

const ThemeContext = createContext<ApiTheme>(DEFAULT_THEME)
let activeThemeLink: HTMLLinkElement | null = null

function setFavicon(theme: ApiTheme) {
  const href = theme.assets['images/favicon.png']
  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (!href) {
    if (favicon?.dataset.pdlThemeCreated === 'true') {
      favicon.remove()
    } else if (favicon?.dataset.pdlOriginalHref !== undefined) {
      const originalHref = favicon.dataset.pdlOriginalHref
      if (originalHref) favicon.setAttribute('href', originalHref)
      else favicon.removeAttribute('href')
      delete favicon.dataset.pdlOriginalHref
    }
    return
  }
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    favicon.dataset.pdlThemeCreated = 'true'
    document.head.appendChild(favicon)
  } else if (favicon.dataset.pdlOriginalHref === undefined) {
    favicon.dataset.pdlOriginalHref = favicon.getAttribute('href') ?? ''
  }
  favicon.href = href
}

async function applyTheme(theme: ApiTheme) {
  configureRuntimeTheme(theme.assets)
  document.documentElement.dataset.pdlTheme = theme.id
  if (theme.presentation?.renderer) document.documentElement.dataset.pdlRenderer = theme.presentation.renderer
  else delete document.documentElement.dataset.pdlRenderer
  activeThemeLink?.remove()
  activeThemeLink = null
  if (theme.stylesheet_url) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = theme.stylesheet_url
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
  setFavicon(theme)
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
