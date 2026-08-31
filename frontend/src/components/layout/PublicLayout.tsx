import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { themeImage } from '../../theme/assets'
import { useDefaultTheme } from '../../theme/useDefaultTheme'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/informacoes', label: 'Informações' },
  { to: '/wiki', label: 'Wiki' },
  { to: '/news', label: 'Notícias' },
  { to: '/faq', label: 'Perguntas Frequentes' },
]

function navActive(path: string, to: string, end?: boolean) {
  if (end) return path === to
  return path === to || path.startsWith(`${to}/`)
}

export function PublicLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loading, setLoading] = useState(true)

  useDefaultTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 1)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    const timer = window.setTimeout(() => setLoading(false), 700)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <>
      <div className={`loading${loading ? '' : ' scale'}`} style={loading ? undefined : { display: 'none' }}>
        <div className="l-logo">
          <div className="letters">
            <img src={themeImage('logo.png')} alt="Logo do Lineage2" />
          </div>
          <div className="circle">
            <img src={themeImage('logo-circle.png')} alt="" />
          </div>
        </div>
      </div>

      <nav className={scrolled ? 'scrolled' : undefined}>
        <div className="open" onClick={() => setMenuOpen(true)}>
          <i className="fa-solid fa-bars" />
        </div>

        <ul className={menuOpen ? 'active' : undefined}>
          <div className="close" onClick={() => setMenuOpen(false)}>
            <i className="fa-solid fa-xmark" />
          </div>
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

      <div className="main-content">
        <Outlet />
      </div>

      <footer>
        <div className="language">
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>
              <img src={themeImage('icons/world.png')} alt="" />
              &nbsp;&nbsp;&nbsp;Português
            </span>
            <span>
              <img className="cursor" src={themeImage('icons/downcursor.png')} alt="" />
            </span>
          </span>
          <ul className="language-dropdown">
            <li>
              <span>Português</span>
            </li>
          </ul>
        </div>

        <div className="copyright container">
          <div className="c-link">
            <Link to="/agreement">Acordo do Usuário</Link>
            <Link to="/terms">Termos de Serviço</Link>
            <Link to="/privacy">Política de Privacidade</Link>
          </div>
          <div className="c-text">
            <img src={themeImage('logo.png')} alt="Logo do Lineage2" />
            <p>© {new Date().getFullYear()} PDL PRO</p>
            <span style={{ textAlign: 'center', display: 'block' }}>Feito com ❤️ por aventureiros para aventureiros.</span>
          </div>
        </div>
      </footer>
    </>
  )
}

export function PublicContent() {
  return <Outlet />
}
