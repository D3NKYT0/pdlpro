import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CircleUserRound } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { programsApi } from '../../services/api'
import { PdlSymbol } from '../PdlSymbol'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/informacoes', label: 'Informações' },
  { to: '/rankings', label: 'Rankings', resource: 'rankings' },
  { to: '/wiki', label: 'Wiki', resource: 'wiki' },
  { to: '/news', label: 'Notícias', resource: 'news' },
  { to: '/roadmap', label: 'Roadmap', resource: 'roadmap' },
  { to: '/faq', label: 'Perguntas Frequentes', resource: 'faq' },
]

function navActive(path: string, to: string, end?: boolean) {
  if (end) return path === to
  return path === to || path.startsWith(`${to}/`)
}

export function SiteNav() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
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
    <nav className={`site-nav${scrolled ? ' scrolled' : ''}`} aria-label="Navegação principal">
      <div className="site-nav-shell">
        <Link className="site-nav-brand" to="/" aria-label="PDL PRO — Início">
          <PdlSymbol className="site-brand-mark" />
          <span className="site-brand-copy"><strong>PDL PRO</strong><small>Lineage</small></span>
        </Link>

        <button type="button" className="open" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="site-navigation-drawer" onClick={() => setMenuOpen(true)}>
          <i className="fa-solid fa-bars" aria-hidden="true" />
        </button>

        <div className={`site-nav-drawer${menuOpen ? ' is-open' : ''}`} id="site-navigation-drawer">
          <div className="site-nav-drawer-head">
            <PdlSymbol className="site-brand-mark" />
            <span>Explore o reino</span>
            <button type="button" className="close" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>
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
        </div>

        <div className="site-nav-actions">
          {user ? (
            <Link className="user" to="/painel">
              <CircleUserRound aria-hidden="true" />
              <span>Minha Conta</span>
            </Link>
          ) : (
            <Link className="user" to="/login">
              <CircleUserRound aria-hidden="true" />
              <span>Entrar</span>
            </Link>
          )}
          {downloadsEnabled ? <Link className="download" to="/downloads">Download</Link> : null}
        </div>
      </div>
      <button className={`site-nav-backdrop${menuOpen ? ' is-open' : ''}`} type="button" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} />
    </nav>
  )
}
