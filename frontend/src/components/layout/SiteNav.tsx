import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { themeImage } from '../../theme/assets'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/informacoes', label: 'Informações' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/wiki', label: 'Wiki' },
  { to: '/news', label: 'Notícias' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/faq', label: 'Perguntas Frequentes' },
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 1)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <nav className={scrolled ? 'scrolled' : undefined}>
      <button type="button" className="open" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
        <i className="fa-solid fa-bars" />
      </button>

      <ul className={menuOpen ? 'active' : undefined}>
        <button type="button" className="close" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>
          <i className="fa-solid fa-xmark" />
        </button>
        <span>
          <img src={themeImage('icons/nav-icon.png')} alt="" />
        </span>
        {links.map((link) => (
          <li key={link.to} className={navActive(pathname, link.to, link.end) ? 'active' : undefined}>
            <Link to={link.to}>{link.label}</Link>
          </li>
        ))}
      </ul>

      <div>
        {user ? (
          <Link className="user" to="/painel">
            <img src={themeImage('icons/user.png')} alt="" />
            <span>Minha Conta</span>
          </Link>
        ) : (
          <Link className="user" to="/login">
            <img src={themeImage('icons/user.png')} alt="" />
            <span>Entrar</span>
          </Link>
        )}
        <Link className="download" to="/downloads">
          Download
        </Link>
      </div>
    </nav>
  )
}
