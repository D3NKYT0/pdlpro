import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { notificationApi } from '../../services/api'

const links = [
  { to: '/painel', label: 'Painel', end: true },
  { to: '/painel/accounts', label: 'Conta L2' },
  { to: '/painel/inventory', label: 'Inventário' },
  { to: '/painel/wallet', label: 'Carteira' },
  { to: '/painel/shop', label: 'Loja' },
  { to: '/painel/marketplace', label: 'Marketplace' },
  { to: '/painel/auctions', label: 'Leilão' },
  { to: '/painel/games', label: 'Jogos' },
  { to: '/painel/progress', label: 'Progresso' },
  { to: '/painel/clans', label: 'Clãs' },
  { to: '/painel/feed', label: 'Feed' },
  { to: '/painel/friends', label: 'Amigos' },
  { to: '/painel/notifications', label: 'Avisos' },
]

export function PrivateLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const notices = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.list,
    enabled: Boolean(user),
  })
  const unread = notices.data?.unread ?? 0

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Painel</div>
        <NavLink className="site-back" to="/">
          Voltar ao site
        </NavLink>
        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
              {link.to === '/painel/notifications' && unread ? ` (${unread})` : ''}
            </NavLink>
          ))}
        </nav>
        <div>
          {user ? (
            <>
              <div className="muted">{user.display_name}</div>
              {!user.is_email_verified ? <div className="muted">Confirme seu e-mail</div> : null}
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  void logout().then(() => navigate('/'))
                }}
              >
                Sair
              </button>
            </>
          ) : null}
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
