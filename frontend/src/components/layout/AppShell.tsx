import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { notificationApi } from '../../services/api'

const links = [
  { to: '/', label: 'Início' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/news', label: 'Notícias' },
  { to: '/wiki', label: 'Wiki' },
  { to: '/calendar', label: 'Calendário' },
  { to: '/faq', label: 'FAQ' },
  { to: '/feed', label: 'Feed' },
  { to: '/clans', label: 'Clãs' },
  { to: '/friends', label: 'Amigos' },
  { to: '/shop', label: 'Loja' },
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/auctions', label: 'Leilão' },
  { to: '/games', label: 'Jogos' },
  { to: '/progress', label: 'Progresso' },
  { to: '/accounts', label: 'Conta L2' },
  { to: '/inventory', label: 'Inventário' },
  { to: '/wallet', label: 'Carteira' },
  { to: '/notifications', label: 'Avisos' },
  { to: '/downloads', label: 'Downloads' },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const notices = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.list,
    enabled: Boolean(user),
  })
  const unread = notices.data?.unread ?? 0

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">PDL PRO</div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}>
              {link.label}
              {link.to === '/notifications' && unread ? ` (${unread})` : ''}
            </NavLink>
          ))}
        </nav>
        <div>
          {user ? (
            <>
              <div className="muted">{user.display_name}</div>
              {!user.is_email_verified ? <div className="muted">Confirme seu e-mail</div> : null}
              <button className="btn ghost" type="button" onClick={() => void logout()}>
                Sair
              </button>
            </>
          ) : (
            <NavLink to="/login">Entrar</NavLink>
          )}
        </div>
        <p className="muted legal-links">
          <NavLink to="/terms">Termos</NavLink>
          {' · '}
          <NavLink to="/privacy">Privacidade</NavLink>
          {' · '}
          <NavLink to="/agreement">Acordo</NavLink>
        </p>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
