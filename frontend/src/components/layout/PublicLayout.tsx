import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/', label: 'Início' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/news', label: 'Notícias' },
  { to: '/wiki', label: 'Wiki' },
  { to: '/faq', label: 'FAQ' },
  { to: '/calendar', label: 'Calendário' },
]

export function PublicLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const home = pathname === '/'

  return (
    <div className={`public-site${home ? ' is-home' : ''}`}>
      <nav className="public-nav">
        <NavLink className="public-brand" to="/">
          PDL PRO
        </NavLink>
        <button className="public-nav-toggle" type="button" aria-label="Menu" onClick={() => setOpen((value) => !value)}>
          {open ? 'Fechar' : 'Menu'}
        </button>
        <ul className={open ? 'is-open' : undefined} onClick={() => setOpen(false)}>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === '/'}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="public-nav-actions">
          {user ? (
            <Link className="public-user" to="/painel">
              Minha conta
            </Link>
          ) : (
            <Link className="public-user" to="/login">
              Entrar
            </Link>
          )}
          <Link className="public-download" to="/downloads">
            Download
          </Link>
        </div>
      </nav>
      <div className="public-main">
        <Outlet />
      </div>
      <footer className="public-footer">
        <div className="public-footer-links">
          <Link to="/agreement">Acordo do usuário</Link>
          <Link to="/terms">Termos de serviço</Link>
          <Link to="/privacy">Política de privacidade</Link>
        </div>
        <p>© {new Date().getFullYear()} PDL PRO</p>
        <p className="muted">Feito com cuidado por aventureiros para aventureiros.</p>
      </footer>
    </div>
  )
}

export function PublicContent() {
  return (
    <div className="public-page">
      <Outlet />
    </div>
  )
}
