import { Card } from '../components/ui/Card'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Gamepad2,
  KeyRound,
  Package,
  Server,
  ShoppingBag,
  SlidersHorizontal,
  Trophy,
  UserRoundCog,
  CircleUserRound,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { AchievementGrid } from '../components/AchievementGrid'
import { useAuth } from '../contexts/AuthContext'
import { canAccessStaff } from '../lib/staff'
import { authApi, serverApi } from '../services/api'
import { programsApi } from '../services/domain/programs.service'

const shortcuts: Array<{ to: string; label: string; text: string; icon: LucideIcon; resource?: string }> = [
  { to: '/painel/profile', label: 'Meu perfil', text: 'Avatar, nome e biografia', icon: CircleUserRound, resource: 'profile' },
  { to: '/painel/accounts', label: 'Conta L2', text: 'Vincular login e personagens', icon: UserRoundCog, resource: 'accounts' },
  { to: '/painel/inventory', label: 'Inventário', text: 'Retirar e depositar itens', icon: Package, resource: 'inventory' },
  { to: '/painel/wallet', label: 'Carteira', text: 'Saldo, PIX e transferências', icon: WalletCards, resource: 'wallet' },
  { to: '/painel/shop', label: 'Loja', text: 'Itens da loja do painel', icon: ShoppingBag, resource: 'shop' },
  { to: '/painel/games', label: 'Jogos', text: 'Roleta, caixas, pesca e mais', icon: Gamepad2, resource: 'games' },
  { to: '/painel/progress', label: 'Conquistas', text: 'Marcos da conta e prêmios', icon: Trophy, resource: 'progress' },
]

export function PainelPage() {
  const { user } = useAuth()
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const resourceEnabled = (code?: string) =>
    !code || !resources.data?.some((r) => r.code === code && !r.enabled)
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const progress = useQuery({
    queryKey: ['progress'],
    queryFn: authApi.progress,
    enabled: Boolean(user) && resourceEnabled('progress'),
  })
  const baseShortcuts = shortcuts.filter((item) => resourceEnabled(item.resource))
  const dashboardShortcuts = canAccessStaff(user)
    ? [...baseShortcuts, { to: '/painel/admin', label: 'Admin', text: 'Configurar o painel, rates e loja', icon: SlidersHorizontal }]
    : baseShortcuts

  return (
    <div className="grid panel-dashboard">
      <Card className="panel-welcome">
        <span className="panel-eyebrow">Visão geral da conta</span>
        <h1>Olá, {user?.display_name || user?.username}</h1>
        <p className="muted">Gerencie sua jornada, seus personagens e recompensas em um só lugar.</p>
      </Card>

      <section className="grid cols-3 panel-status-grid" aria-label="Status do servidor">
        <Card as="article" className="status-card">
          <Server aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">Game server</span>
            <div className={status.data?.game_online ? 'badge' : 'badge off'}>
              {status.data?.game_online ? 'Online' : 'Offline'}
            </div>
          </div>
        </Card>
        <Card as="article" className="status-card">
          <KeyRound aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">Login server</span>
            <div className={status.data?.login_online ? 'badge' : 'badge off'}>
              {status.data?.login_online ? 'Online' : 'Offline'}
            </div>
          </div>
        </Card>
        <Card as="article" className="status-card">
          <Users aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">Jogadores online</span>
            <div className="stat">{status.data?.players_online ?? 0}</div>
          </div>
        </Card>
      </section>

      {resourceEnabled('progress') ? <AchievementGrid achievements={progress.data?.achievements ?? []} /> : null}

      <section className="panel-section-heading">
        <div>
          <span className="panel-eyebrow">Acesso rápido</span>
          <h2>Continue sua aventura</h2>
        </div>
      </section>

      <section className="grid cols-3 panel-shortcuts">
        {dashboardShortcuts.map((item) => {
          const Icon = item.icon
          return (
            <Link className="card shortcut-card" key={item.to} to={item.to}>
              <span className="shortcut-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="shortcut-copy">
                <h3>{item.label}</h3>
                <p className="muted">{item.text}</p>
              </span>
              <ArrowUpRight className="shortcut-arrow" aria-hidden="true" />
            </Link>
          )
        })}
      </section>
    </div>
  )
}
