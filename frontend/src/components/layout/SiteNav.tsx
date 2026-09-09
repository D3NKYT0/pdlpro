import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CircleUserRound } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { programsApi } from '../../services/api'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { PdlSymbol } from '../PdlSymbol'

function navActive(path: string, to: string, end?: boolean) {
  if (end) return path === to
  return path === to || path.startsWith(`${to}/`)
}

export function SiteNav() {
  const { t } = useTranslation('public')
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/informacoes', label: t('nav.info') },
    { to: '/rankings', label: t('nav.rankings'), resource: 'rankings' },
    { to: '/wiki', label: t('nav.wiki'), resource: 'wiki' },
    { to: '/news', label: t('nav.news'), resource: 'news' },
    { to: '/roadmap', label: t('nav.roadmap'), resource: 'roadmap' },
    { to: '/faq', label: t('nav.faq'), resource: 'faq' },
  ]
  const visibleLinks = links.filter(
    (link) => !link.resource || !resources.data?.some((r) => r.code === link.resource && !r.enabled),
  )
  const downloadsEnabled = !resources.data?.some((r) => r.code === 'downloads' && !r.enabled)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 1)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <nav className={`site-nav${scrolled ? ' scrolled' : ''}`} aria-label={t('nav.main')}>
      <div className="site-nav-shell">
        <Link className="site-nav-brand" to="/" aria-label={t('nav.brandHome')}>
          <PdlSymbol className="site-brand-mark" />
          <span className="site-brand-copy"><strong>PDL PRO</strong><small>Lineage</small></span>
        </Link>

        <button type="button" className="open" aria-label={t('nav.openMenu')} aria-expanded={menuOpen} aria-controls="site-navigation-drawer" onClick={() => setMenuOpen(true)}>
          <i className="fa-solid fa-bars" aria-hidden="true" />
        </button>

        <div className={`site-nav-drawer${menuOpen ? ' is-open' : ''}`} id="site-navigation-drawer">
          <div className="site-nav-drawer-head">
            <PdlSymbol className="site-brand-mark" />
            <span>{t('nav.exploreRealm')}</span>
            <button type="button" className="close" aria-label={t('nav.closeMenu')} onClick={() => setMenuOpen(false)}>
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
          <ul>
            {visibleLinks.map((link) => {
              const active = navActive(pathname, link.to, link.end)
              return (
                <li key={link.to} className={active ? 'active' : undefined}>
                  <Link to={link.to} aria-current={active ? 'page' : undefined}>{link.label}</Link>
                </li>
              )
            })}
          </ul>
          <div className="site-nav-drawer-locale">
            <LanguageSwitcher id="nav-drawer-language" />
          </div>
        </div>

        <div className="site-nav-actions">
          <LanguageSwitcher className="site-nav-language" id="nav-language" />
          {user ? (
            <Link className="user" to="/painel">
              <CircleUserRound aria-hidden="true" />
              <span>{t('nav.myAccount')}</span>
            </Link>
          ) : (
            <Link className="user" to="/login">
              <CircleUserRound aria-hidden="true" />
              <span>{t('nav.signIn')}</span>
            </Link>
          )}
          {downloadsEnabled ? <Link className="download" to="/downloads">{t('nav.download')}</Link> : null}
        </div>
      </div>
      <button className={`site-nav-backdrop${menuOpen ? ' is-open' : ''}`} type="button" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} />
    </nav>
  )
}
