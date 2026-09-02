import { Card } from '../../components/ui/Card'
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
  Palette,
  Unlink,
  type LucideIcon,
} from 'lucide-react'

type Entry = { to: string; title: string; description: string; icon: LucideIcon; external?: boolean }
type Category = { name: string; entries: Entry[] }

const categories: Category[] = [
  {name: 'Programas e expansão', entries: [
    {to:'/painel/admin/apoiadores',title:'Apoiadores e comissões',description:'Candidaturas, percentuais e aprovação de comissões',icon:Coins},
    {to:'/painel/admin/comercio',title:'Pacotes e cupons',description:'Pacotes de itens, descontos e cupons de apoiadores',icon:ShoppingBag},
    {to:'/painel/admin/recursos',title:'Controle de recursos',description:'Ativar ou pausar módulos por categoria',icon:Settings2},
    {to:'/painel/admin/roadmap',title:'Roadmap',description:'Planejamento, etapas e novidades do servidor',icon:CalendarDays},
    {to:'/painel/admin/recompensas',title:'Oficina de recompensas',description:'Temporadas, missões, trocas, bônus e iscas',icon:Gamepad2},
  ]},
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
      { to: '/painel/admin/temas', title: 'Temas', description: 'Instalar, ativar e restaurar a aparência do frontend', icon: Palette },
      { to: '/admin/', title: 'Django Admin', description: 'CRUD completo do sistema', icon: ExternalLink, external: true },
    ],
  },
  {
    name: 'Financeiro',
    entries: [
      { to: '/painel/admin/financeiro/saldos', title: 'Relatórios financeiros', description: 'Saldos, fluxo de caixa, pedidos e reconciliação de carteiras', icon: ChartNoAxesCombined },
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
      { to: '/painel/admin/contas', title: 'Contas Lineage', description: 'Consultar login e remover o vínculo com o painel', icon: Unlink },
    ],
  },
]

export function AdminHubPage() {
  return (
    <div className="account-page admin-hub">
      <Card as="header" className="account-hero">
        <div>
          <span className="panel-eyebrow">Área administrativa</span>
          <h1>Central de configurações</h1>
          <p className="muted">Configure o painel como no PDL antigo, sem sair da área do jogador.</p>
        </div>
        <span className="account-status-pill is-active">
          <SlidersHorizontal aria-hidden="true" />
          Staff
        </span>
      </Card>

      {categories.map((category) => (
        <Card className="admin-category" key={category.name}>
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
        </Card>
      ))}

      <p className="muted admin-hub-note">
        <Bell aria-hidden="true" />
        Notificações, calendário e o restante do CRUD fino continuam no Django Admin.
      </p>
    </div>
  )
}
