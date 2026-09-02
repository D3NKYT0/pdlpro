import { useEffect } from 'react'
import { PANEL_THEME_STYLES, themeImage } from './assets'
import { reassertInstalledTheme } from './ThemeProvider'

function upsertPanelStyle(href: string) {
  const existing = document.querySelector<HTMLLinkElement>(`link[data-pdl-panel-theme="${href}"]`)
  if (existing) return existing

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.pdlPanelTheme = href
  document.head.appendChild(link)
  return link
}

export function usePanelTheme() {
  useEffect(() => {
    document.documentElement.classList.add('pdl-panel')
    document.body.style.background = `url(${themeImage('bg/5.jpg')}) top fixed no-repeat`
    document.body.style.backgroundColor = '#050505'
    document.body.style.backgroundSize = 'cover'
    document.body.style.minHeight = '100vh'

    const styles = PANEL_THEME_STYLES.map(upsertPanelStyle)
    reassertInstalledTheme()

    return () => {
      document.documentElement.classList.remove('pdl-panel')
      document.body.style.background = ''
      document.body.style.backgroundColor = ''
      document.body.style.backgroundSize = ''
      document.body.style.minHeight = ''
      styles.forEach((link) => link.remove())
    }
  }, [])
}
