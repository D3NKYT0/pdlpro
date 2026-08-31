import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/', label: 'Início' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/news', label: 'Notícias' },
  { to: '/shop', label: 'Loja' },
  { to: '/wallet', label: 'Carteira' },
  { to: '/downloads', label: 'Downloads' },
]

export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">PDL PRO</div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div>
          {user ? (
            <>
              <div className="muted">{user.display_name}</div>
              <button className="btn ghost" type="button" onClick={() => void logout()}>
                Sair
              </button>
            </>
          ) : (
            <NavLink to="/login">Entrar</NavLink>
          )}
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
