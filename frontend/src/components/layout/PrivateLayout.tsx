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
  ShoppingBag,
  Store,
  Trophy,
  UserRoundCog,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { notificationApi } from '../../services/api'
import { themeImage } from '../../theme/assets'
import { usePanelTheme } from '../../theme/usePanelTheme'
import { SiteNav } from './SiteNav'

const links: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/painel', label: 'Painel', icon: LayoutDashboard, end: true },
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
      <SiteNav />
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
          <div className="panel-menu" aria-label="Navegação da área do jogador">
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
          </div>
          <div className="panel-user">
            {user ? (
              <>
                <div className="panel-user-avatar" aria-hidden="true">
                  <CircleUserRound />
                </div>
                <div className="panel-user-copy">
                  <strong>{user.display_name || user.username}</strong>
                  <span>{user.is_email_verified ? 'Conta verificada' : 'Confirme seu e-mail'}</span>
                </div>
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
