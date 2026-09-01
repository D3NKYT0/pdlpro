import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bell,
  CircleUserRound,
  Gamepad2,
  Gavel,
  LayoutDashboard,
  LogOut,
  Package,
  Shield,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Trophy,
  UserRoundCog,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { canAccessStaff } from '../../lib/staff'
import { notificationApi } from '../../services/api'
import { themeImage } from '../../theme/assets'
import { usePanelTheme } from '../../theme/usePanelTheme'

const links: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/painel', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/painel/profile', label: 'Meu perfil', icon: CircleUserRound },
  { to: '/painel/security', label: 'Conta e segurança', icon: ShieldCheck },
  { to: '/painel/accounts', label: 'Conta L2', icon: UserRoundCog },
  { to: '/painel/inventory', label: 'Inventário', icon: Package },
  { to: '/painel/wallet', label: 'Carteira', icon: WalletCards },
  { to: '/painel/shop', label: 'Loja', icon: ShoppingBag },
  { to: '/painel/marketplace', label: 'Marketplace', icon: Store },
  { to: '/painel/auctions', label: 'Leilão', icon: Gavel },
  { to: '/painel/games', label: 'Jogos', icon: Gamepad2 },
  { to: '/painel/progress', label: 'Progresso', icon: Trophy },
  { to: '/painel/clans', label: 'Clãs', icon: Shield },
  { to: '/painel/notifications', label: 'Avisos', icon: Bell },
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

  usePanelTheme()

  return (
    <div className="panel-app">
      <div className="shell">
        <aside className="sidebar">
          <div className="panel-brand">
            <img className="panel-brand-mark" src={themeImage('logo-circle.png')} alt="" />
            <div>
              <span className="panel-kicker">Área do jogador</span>
              <div className="brand">Painel</div>
            </div>
          </div>
          <NavLink className="site-back" to="/">
            <ArrowLeft aria-hidden="true" />
            <span>Voltar ao site</span>
          </NavLink>
          <div className="panel-menu" role="navigation" aria-label="Navegação da área do jogador">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <NavLink key={link.to} to={link.to} end={link.end}>
                  <Icon aria-hidden="true" />
                  <span>{link.label}</span>
                  {link.to === '/painel/notifications' && unread ? <b className="menu-badge">{unread}</b> : null}
                </NavLink>
              )
            })}
            {canAccessStaff(user) ? (
              <NavLink to="/painel/admin">
                <SlidersHorizontal aria-hidden="true" />
                <span>Admin</span>
              </NavLink>
            ) : null}
          </div>
          <div className="panel-user">
            {user ? (
              <>
                <NavLink className="panel-user-avatar" to="/painel/profile" aria-label="Abrir meu perfil">
                  {user.avatar_url ? <img src={user.avatar_url} alt="" /> : <CircleUserRound />}
                </NavLink>
                <NavLink className="panel-user-copy" to="/painel/profile">
                  <strong>{user.display_name || user.username}</strong>
                  <span>{user.is_email_verified ? 'Conta verificada' : 'Confirme seu e-mail'}</span>
                </NavLink>
                <button
                  className="btn ghost"
                  type="button"
                  title="Sair da conta"
                  onClick={() => {
                    void logout().then(() => navigate('/'))
                  }}
                >
                  <LogOut aria-hidden="true" />
                  <span>Sair</span>
                </button>
              </>
            ) : null}
          </div>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
