import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Gamepad2,
  KeyRound,
  Package,
  Server,
  ShoppingBag,
  UserRoundCog,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { serverApi } from '../services/api'

const shortcuts: Array<{ to: string; label: string; text: string; icon: LucideIcon }> = [
  { to: '/painel/accounts', label: 'Conta L2', text: 'Vincular login e personagens', icon: UserRoundCog },
  { to: '/painel/inventory', label: 'Inventário', text: 'Retirar e depositar itens', icon: Package },
  { to: '/painel/wallet', label: 'Carteira', text: 'Saldo, PIX e transferências', icon: WalletCards },
  { to: '/painel/shop', label: 'Loja', text: 'Itens da loja do painel', icon: ShoppingBag },
  { to: '/painel/games', label: 'Jogos', text: 'Roleta, caixas, pesca e mais', icon: Gamepad2 },
]

export function PainelPage() {
  const { user } = useAuth()
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })

  return (
    <div className="grid panel-dashboard">
      <section className="card panel-welcome">
        <span className="panel-eyebrow">Visão geral da conta</span>
        <h1>Olá, {user?.display_name || user?.username}</h1>
        <p className="muted">Gerencie sua jornada, seus personagens e recompensas em um só lugar.</p>
      </section>

      <section className="grid cols-3 panel-status-grid" aria-label="Status do servidor">
        <article className="card status-card">
          <Server aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">Game server</span>
            <div className={status.data?.game_online ? 'badge' : 'badge off'}>
              {status.data?.game_online ? 'Online' : 'Offline'}
            </div>
          </div>
        </article>
        <article className="card status-card">
          <KeyRound aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">Login server</span>
            <div className={status.data?.login_online ? 'badge' : 'badge off'}>
              {status.data?.login_online ? 'Online' : 'Offline'}
            </div>
          </div>
        </article>
        <article className="card status-card">
          <Users aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">Jogadores online</span>
            <div className="stat">{status.data?.players_online ?? 0}</div>
          </div>
        </article>
      </section>

      <section className="panel-section-heading">
        <div>
          <span className="panel-eyebrow">Acesso rápido</span>
          <h2>Continue sua aventura</h2>
        </div>
      </section>

      <section className="grid cols-3 panel-shortcuts">
        {shortcuts.map((item) => {
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
