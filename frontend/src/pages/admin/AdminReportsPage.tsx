import { type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChartNoAxesCombined,
  Gavel,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import {
  isApiError,
  operationalReportsApi,
  type OperationalReport,
  type OperationalReportKind,
} from '../../services/api'
import { AdminHeader } from './AdminChrome'
import { AdminFinancialReportsPage } from './AdminFinancialReportsPage'
import './financial-reports.css'

type CategorySlug = 'financeiro' | 'inventario' | 'leiloes' | 'compras' | 'marketplace'

const categories: {
  slug: CategorySlug
  title: string
  description: string
  icon: LucideIcon
  to: string
}[] = [
  {
    slug: 'financeiro',
    title: 'Financeiro',
    description: 'Saldos, fluxo de caixa, pedidos e reconciliação de carteiras.',
    icon: ChartNoAxesCombined,
    to: '/painel/admin/relatorios/financeiro/saldos',
  },
  {
    slug: 'inventario',
    title: 'Inventário',
    description: 'Movimentações do inventário do painel, tops de itens e usuários.',
    icon: Package,
    to: '/painel/admin/relatorios/inventario',
  },
  {
    slug: 'leiloes',
    title: 'Leilões',
    description: 'Status dos leilões, lances e itens com mais atividade.',
    icon: Gavel,
    to: '/painel/admin/relatorios/leiloes',
  },
  {
    slug: 'compras',
    title: 'Compras da loja',
    description: 'Receita da loja, carrinhos abandonados e tops de itens e cupons.',
    icon: ShoppingBag,
    to: '/painel/admin/relatorios/compras',
  },
  {
    slug: 'marketplace',
    title: 'Marketplace',
    description: 'Anúncios de personagens, vendas e ranking de vendedores.',
    icon: Store,
    to: '/painel/admin/relatorios/marketplace',
  },
]

const categoryToKind: Record<Exclude<CategorySlug, 'financeiro'>, OperationalReportKind> = {
  inventario: 'inventory',
  leiloes: 'auctions',
  compras: 'purchases',
  marketplace: 'marketplace',
}

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
  completed: 'Concluída',
  for_sale: 'À venda',
  sold: 'Vendido',
  disputed: 'Em disputa',
  RETIROU_DO_JOGO: 'Retirou do jogo',
  INSERIU_NO_JOGO: 'Inseriu no jogo',
  TROCA_ENTRE_PERSONAGENS: 'Troca entre personagens',
}

const numberFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const quantity = (value: string | number) => numberFormat.format(Number(value))
const dateTime = (value: string | null | undefined) => (value ? new Date(value).toLocaleString('pt-BR') : '—')
const dayLabel = (value: string) => value.split('-').reverse().join('/')

function Metric({ label, value, detail, tone }: { label: string; value: ReactNode; detail?: string; tone?: string }) {
  return (
    <article className={`card finance-metric ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  )
}

function Status({ value }: { value: string }) {
  return <span className={`finance-status is-${value}`}>{statusLabels[value] || value}</span>
}

function ReportsHub() {
  const { t } = useTranslation('admin')
  return (
    <div className="account-page financial-reports">
      <AdminHeader
        kicker={t('common:staff', { defaultValue: 'Staff' })}
        title={t('reports.title')}
        description={t('reports.description')}
      />
      <div className="admin-entry-grid">
        {categories.map((category) => {
          const Icon = category.icon
          return (
            <Link className="admin-entry" to={category.to} key={category.slug}>
              <span className="admin-entry-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>
                <strong>{t(`reports.categories.${category.slug}.title`)}</strong>
                <small>{t(`reports.categories.${category.slug}.description`)}</small>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function OperationalFilters({
  kind,
  params,
  apply,
}: {
  kind: OperationalReportKind
  params: URLSearchParams
  apply: (params: URLSearchParams) => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = new URLSearchParams()
    new FormData(event.currentTarget).forEach((value, key) => {
      if (String(value).trim()) next.set(key, String(value).trim())
    })
    apply(next)
  }
  const statuses =
    kind === 'auctions'
      ? ['open', 'finished', 'cancelled']
      : kind === 'marketplace'
        ? ['for_sale', 'sold', 'cancelled', 'disputed']
        : kind === 'purchases'
          ? ['completed', 'cancelled']
          : []
  return (
    <form className="card finance-filters" onSubmit={submit}>
      <Field>
        Usuário
        <input name="username" defaultValue={params.get('username') || ''} placeholder="Buscar pelo nome" maxLength={150} />
      </Field>
      <Field>
        Data inicial
        <input type="date" name="date_from" defaultValue={params.get('date_from') || ''} />
      </Field>
      <Field>
        Data final
        <input type="date" name="date_to" defaultValue={params.get('date_to') || ''} />
      </Field>
      {kind === 'inventory' ? (
        <Field>
          Ação
          <select name="action" defaultValue={params.get('action') || ''}>
            <option value="">Todas</option>
            {['RETIROU_DO_JOGO', 'INSERIU_NO_JOGO', 'TROCA_ENTRE_PERSONAGENS'].map((action) => (
              <option key={action} value={action}>
                {statusLabels[action]}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {statuses.length ? (
        <Field>
          Situação
          <select name="status" defaultValue={params.get('status') || ''}>
            <option value="">Todas</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field>
        Por página
        <select name="page_size" defaultValue={params.get('page_size') || '20'}>
          <option value="20">20 registros</option>
          <option value="50">50 registros</option>
        </select>
      </Field>
      <div className="finance-actions">
        <Button type="submit">
          <Search size={16} />
          Aplicar filtros
        </Button>
        <Button className="secondary" type="button" onClick={() => apply(new URLSearchParams())}>
          Limpar
        </Button>
      </div>
    </form>
  )
}

function OperationalSummary({ data }: { data: OperationalReport }) {
  if (data.kind === 'inventory') {
    const actions = data.summary.actions as Record<string, { quantity: number; events: number }>
    return (
      <>
        <div className="finance-metrics">
          <Metric label="Movimentações" value={quantity(data.summary.log_count as number)} detail={`Janela de ${data.summary.window_days} dias`} />
          <Metric label="Itens distintos" value={quantity(data.summary.unique_items as number)} />
          <Metric label="Usuários" value={quantity(data.summary.unique_users as number)} />
        </div>
        <div className="finance-status-counts" aria-label="Totais por ação">
          {Object.entries(actions || {}).map(([action, row]) => (
            <span key={action}>
              <Status value={action} />
              <b>{quantity(row.quantity)}</b>
            </span>
          ))}
        </div>
      </>
    )
  }
  if (data.kind === 'auctions') {
    return (
      <div className="finance-metrics">
        <Metric label="Leilões" value={quantity(data.summary.auction_count as number)} />
        <Metric label="Abertos" value={quantity(data.summary.open_count as number)} tone="is-positive" />
        <Metric label="Finalizados" value={quantity(data.summary.finished_count as number)} />
        <Metric label="Lances" value={quantity(data.summary.bid_count as number)} />
      </div>
    )
  }
  if (data.kind === 'purchases') {
    return (
      <div className="finance-metrics">
        <Metric label="Compras" value={quantity(data.summary.purchase_count as number)} />
        <Metric label="Concluídas" value={quantity(data.summary.completed_count as number)} tone="is-positive" />
        <Metric label="Receita" value={quantity(data.summary.revenue as string)} detail="Compras concluídas" />
        <Metric label="Carrinhos ativos" value={quantity(data.summary.abandoned_carts as number)} detail="Com itens ou pacotes" />
      </div>
    )
  }
  return (
    <div className="finance-metrics">
      <Metric label="Anúncios" value={quantity(data.summary.listing_count as number)} />
      <Metric label="À venda" value={quantity(data.summary.for_sale_count as number)} tone="is-positive" />
      <Metric label="Vendidos" value={quantity(data.summary.sold_count as number)} />
      <Metric label="Receita vendida" value={quantity(data.summary.sold_revenue as string)} />
    </div>
  )
}

function OperationalTable({ data }: { data: OperationalReport }) {
  if (data.kind === 'inventory') {
    return (
      <table>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Quantidade</th>
            <th>Ações no dia</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((row) => (
            <tr key={String(row.day)}>
              <td>{dayLabel(String(row.day))}</td>
              <td>{quantity(row.total_quantity as number)}</td>
              <td>{quantity(row.event_count as number)}</td>
              <td>
                {Object.entries((row.actions as Record<string, number>) || {}).map(([action, total]) => (
                  <small key={action}>
                    {statusLabels[action] || action}: {quantity(total)}
                  </small>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (data.kind === 'auctions') {
    return (
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Vendedor</th>
            <th>Lance atual</th>
            <th>Lances</th>
            <th>Situação</th>
            <th>Encerra</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((row) => (
            <tr key={String(row.id)}>
              <td>
                <strong>{String(row.item_name)}</strong>
                <small>
                  +{quantity(row.item_enchant as number)} · qtd {quantity(row.quantity as number)}
                </small>
              </td>
              <td>{String(row.seller || '—')}</td>
              <td>{row.current_bid != null ? quantity(row.current_bid as string) : '—'}</td>
              <td>{quantity(row.bid_count as number)}</td>
              <td>
                <Status value={String(row.status)} />
              </td>
              <td>{dateTime(row.ends_at as string)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (data.kind === 'purchases') {
    return (
      <table>
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Total</th>
            <th>Desconto</th>
            <th>Cupom</th>
            <th>Situação</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((row) => (
            <tr key={String(row.id)}>
              <td>
                <strong>{String(row.username)}</strong>
              </td>
              <td>{quantity(row.total as string)}</td>
              <td>{quantity(row.discount as string)}</td>
              <td>{String(row.promo_code || '—')}</td>
              <td>
                <Status value={String(row.status)} />
              </td>
              <td>{dateTime(row.created_at as string)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Personagem</th>
          <th>Vendedor</th>
          <th>Comprador</th>
          <th>Preço</th>
          <th>Situação</th>
          <th>Criado em</th>
        </tr>
      </thead>
      <tbody>
        {data.results.map((row) => (
          <tr key={String(row.id)}>
            <td>
              <strong>{String(row.char_name)}</strong>
              <small>Nv. {quantity(row.char_level as number)}</small>
            </td>
            <td>{String(row.seller || '—')}</td>
            <td>{String(row.buyer || '—')}</td>
            <td>{quantity(row.price as string)}</td>
            <td>
              <Status value={String(row.status)} />
            </td>
            <td>{dateTime(row.created_at as string)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function OperationalReportPanel({ category }: { category: Exclude<CategorySlug, 'financeiro'> }) {
  const kind = categoryToKind[category]
  const meta = categories.find((item) => item.slug === category)!
  const [params, setParams] = useSearchParams()
  const query = useQuery({
    queryKey: ['staff-operational-report', kind, params.toString()],
    queryFn: ({ signal }) => operationalReportsApi.get(kind, params, signal),
  })
  function changePage(page: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(page))
    setParams(next)
  }
  const page = Number(params.get('page') || 1)
  const data = query.data
  return (
    <div className="account-page financial-reports">
      <AdminHeader kicker="Relatórios" title={meta.title} description={meta.description} />
      <nav className="finance-tabs" aria-label="Categorias de relatórios">
        {categories.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.slug} to={item.to} className={() => (item.slug === category ? 'is-active' : '')}>
              <Icon size={18} />
              {item.title}
            </NavLink>
          )
        })}
      </nav>
      <div className="finance-section-heading">
        <div>
          <h2>{meta.title}</h2>
          <p className="muted">{meta.description}</p>
        </div>
        <Button type="submit" className="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw size={16} />
          {query.isFetching ? 'Atualizando…' : 'Atualizar'}
        </Button>
      </div>
      <OperationalFilters key={`${kind}:${params}`} kind={kind} params={params} apply={setParams} />
      {query.isPending && (
        <Card className="finance-empty" role="status">
          Carregando relatório…
        </Card>
      )}
      {query.isError && (
        <Card className="finance-error" role="alert">
          <strong>Não foi possível carregar o relatório.</strong>
          <p>{isApiError(query.error) ? query.error.message : 'Tente novamente.'}</p>
          <Button type="submit" className="secondary" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </Card>
      )}
      {data && !query.isError ? (
        <>
          <OperationalSummary data={data} />
          <Card className="finance-results" aria-busy={query.isFetching}>
            <div className="finance-section-heading">
              <div>
                <h3>Detalhamento</h3>
                <p className="muted">
                  {data.count.toLocaleString('pt-BR')} registros · Totais calculados sobre todos os resultados dos filtros.
                </p>
              </div>
            </div>
            {data.results.length ? (
              <div className="finance-table" tabIndex={0} role="region" aria-label={`Tabela: ${meta.title}`}>
                <OperationalTable data={data} />
              </div>
            ) : (
              <div className="finance-empty">
                <Search size={28} />
                <h3>Nenhum registro encontrado</h3>
                <p className="muted">Ajuste os filtros ou consulte novamente após novas movimentações.</p>
              </div>
            )}
            <div className="finance-pagination">
              <span>
                Página {page} de {data.total_pages}
              </span>
              <div>
                <Button type="submit" className="secondary" disabled={!data.previous || query.isFetching} onClick={() => changePage(page - 1)}>
                  Anterior
                </Button>
                <Button type="submit" className="secondary" disabled={!data.next || query.isFetching} onClick={() => changePage(page + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}

export function AdminReportsPage() {
  const { category, report } = useParams<{ category?: string; report?: string }>()
  if (!category) return <ReportsHub />
  if (category === 'financeiro') {
    if (!report) return <Navigate to="/painel/admin/relatorios/financeiro/saldos" replace />
    return <AdminFinancialReportsPage />
  }
  if (category in categoryToKind) {
    return <OperationalReportPanel category={category as Exclude<CategorySlug, 'financeiro'>} />
  }
  return <Navigate to="/painel/admin/relatorios" replace />
}

export function AdminFinancialReportsRedirect() {
  const { report } = useParams()
  const [params] = useSearchParams()
  const search = params.toString()
  return <Navigate to={`/painel/admin/relatorios/financeiro/${report || 'saldos'}${search ? `?${search}` : ''}`} replace />
}