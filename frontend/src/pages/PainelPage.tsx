import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { serverApi } from '../services/api'

const shortcuts = [
  { to: '/painel/accounts', label: 'Conta L2', text: 'Vincular login e personagens' },
  { to: '/painel/inventory', label: 'Inventário', text: 'Retirar e depositar itens' },
  { to: '/painel/wallet', label: 'Carteira', text: 'Saldo, PIX e transferências' },
  { to: '/painel/shop', label: 'Loja', text: 'Itens da loja do painel' },
  { to: '/painel/games', label: 'Jogos', text: 'Roleta, caixas, pesca e mais' },
]

export function PainelPage() {
  const { user } = useAuth()
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })

  return (
    <div className="grid">
      <section className="card">
        <h1>Olá, {user?.display_name || user?.username}</h1>
        <p className="muted">Sua conta mestra no reino. O site público continua em Início.</p>
      </section>
      <section className="grid cols-3">
        <article className="card">
          <div className="muted">Game server</div>
          <div className={status.data?.game_online ? 'badge' : 'badge off'}>
            {status.data?.game_online ? 'Online' : 'Offline'}
          </div>
        </article>
        <article className="card">
          <div className="muted">Login server</div>
          <div className={status.data?.login_online ? 'badge' : 'badge off'}>
            {status.data?.login_online ? 'Online' : 'Offline'}
          </div>
        </article>
        <article className="card">
          <div className="muted">Jogadores</div>
          <div className="stat">{status.data?.players_online ?? 0}</div>
        </article>
      </section>
      <section className="grid cols-3">
        {shortcuts.map((item) => (
          <Link className="card" key={item.to} to={item.to}>
            <h3>{item.label}</h3>
            <p className="muted">{item.text}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
