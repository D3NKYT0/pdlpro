import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PUBLIC_THEME_STYLES, ROUTE_THEME_STYLES, themeImage } from './assets'

function upsertLink(href: string, group: string) {
  const existing = document.querySelector<HTMLLinkElement>(`link[data-pdl-theme="${href}"]`)
  if (existing) return existing
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.pdlTheme = href
  link.dataset.pdlGroup = group
  document.head.appendChild(link)
  return link
}

export function useDefaultTheme() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.classList.add('pdl-public')
    document.body.style.background = `url(${themeImage('bg/5.jpg')}) top fixed no-repeat`
    document.body.style.backgroundPositionY = '80px'
    document.body.style.backgroundColor = 'black'
    document.body.style.minHeight = '100vh'

    const core = PUBLIC_THEME_STYLES.map((href) => upsertLink(href, 'core'))

    return () => {
      document.documentElement.classList.remove('pdl-public')
      document.body.style.background = ''
      document.body.style.backgroundPositionY = ''
      document.body.style.backgroundColor = ''
      document.body.style.minHeight = ''
      core.forEach((link) => link.remove())
      document.querySelectorAll('link[data-pdl-group="route"]').forEach((link) => link.remove())
    }
  }, [])

  useEffect(() => {
    document.querySelectorAll('link[data-pdl-group="route"]').forEach((link) => link.remove())
    ROUTE_THEME_STYLES.filter((item) => item.test(pathname)).forEach((item) => upsertLink(item.href, 'route'))
  }, [pathname])
}
