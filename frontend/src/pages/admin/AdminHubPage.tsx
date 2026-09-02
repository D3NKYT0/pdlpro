import { Link } from 'react-router-dom'
import {
  Bell,
  ChartNoAxesCombined,
  CalendarDays,
  Coins,
  ExternalLink,
  Gamepad2,
  PackagePlus,
  Headphones,
  Newspaper,
  Server,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'

type Entry = { to: string; title: string; description: string; icon: LucideIcon; external?: boolean }
type Category = { name: string; entries: Entry[] }

const categories: Category[] = [
  {
    name: 'Atendimento',
    entries: [
      { to: '/painel/admin/atendimento', title: 'Fila de chamados', description: 'SLA, responsáveis, respostas e histórico do jogador', icon: Headphones },
    ],
  },
  {
    name: 'Sistema',
    entries: [
      { to: '/painel/admin/servidor', title: 'Painel e servidor', description: 'Nome, rates, chronicle e coming soon', icon: Server },
      { to: '/admin/', title: 'Django Admin', description: 'CRUD completo do sistema', icon: ExternalLink, external: true },
    ],
  },
  {
    name: 'Financeiro',
    entries: [
      { to: '/painel/admin/moedas', title: 'Moedas', description: 'Moeda ativa, multiplicador e taxa', icon: Coins },
      { to: '/painel/admin/loja', title: 'Loja', description: 'Itens vendidos no painel', icon: ShoppingBag },
    ],
  },
  {
    name: 'Jogos',
    entries: [{ to: '/painel/admin/jogos', title: 'Módulos de jogos', description: 'Ligar ou desligar roleta, caixas e o restante', icon: Gamepad2 }],
  },
  {
    name: 'Conteúdo',
    entries: [
      { to: '/painel/admin/noticias', title: 'Notícias', description: 'Publicar avisos do servidor', icon: Newspaper },
      { to: '/painel/admin/servidor', title: 'Coming Soon', description: 'Contagem regressiva da home', icon: CalendarDays },
    ],
  },
  {
    name: 'Servidor',
    entries: [
      { to: '/painel/admin/itens', title: 'Observar itens', description: 'Economia do servidor, favoritos, snapshots e comparação entre datas', icon: ChartNoAxesCombined },
      { to: '/painel/admin/itens/customs', title: 'Itens customizados', description: 'Cadastrar nome, ID, imagem e metadados no catálogo único', icon: PackagePlus },
      { to: '/painel/admin/servicos', title: 'Serviços', description: 'Preços de nick, sexo, slots e destravamento', icon: Settings2 },
    ],
  },
]

export function AdminHubPage() {
  return (
    <div className="account-page admin-hub">
      <header className="card account-hero">
        <div>
          <span className="panel-eyebrow">Área administrativa</span>
          <h1>Central de configurações</h1>
          <p className="muted">Configure o painel como no PDL antigo, sem sair da área do jogador.</p>
        </div>
        <span className="account-status-pill is-active">
          <SlidersHorizontal aria-hidden="true" />
          Staff
        </span>
      </header>

      {categories.map((category) => (
        <section className="card admin-category" key={category.name}>
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">Módulo</span>
              <h2>{category.name}</h2>
            </div>
          </div>
          <div className="admin-entry-grid">
            {category.entries.map((entry) => {
              const Icon = entry.icon
              const body = (
                <>
                  <span className="admin-entry-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{entry.title}</strong>
                    <small>{entry.description}</small>
                  </span>
                </>
              )
              return entry.external ? (
                <a className="admin-entry" key={entry.title} href={entry.to} target="_blank" rel="noreferrer">
                  {body}
                </a>
              ) : (
                <Link className="admin-entry" key={entry.to + entry.title} to={entry.to}>
                  {body}
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      <p className="muted admin-hub-note">
        <Bell aria-hidden="true" />
        Notificações, calendário e o restante do CRUD fino continuam no Django Admin.
      </p>
    </div>
  )
}
