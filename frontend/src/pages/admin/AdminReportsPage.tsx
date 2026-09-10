import { type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
import { formatDateTime, formatNumber } from '../../lib/formatters'
import {
  isApiError,
  operationalReportsApi,
  type OperationalReport,
  type OperationalReportKind,
} from '../../services/api'
import { AdminHeader } from './AdminChrome'
import { AdminFinancialReportsPage } from './AdminFinancialReportsPage'
import './financial-reports.css'

type CategorySlug = 'financial' | 'inventory' | 'auctions' | 'purchases' | 'marketplace'

const categories: {
  slug: CategorySlug
  icon: LucideIcon
  to: string
}[] = [
  {
    slug: 'financial',
    icon: ChartNoAxesCombined,
    to: '/panel/admin/reports/financial/balances',
  },
  {
    slug: 'inventory',
    icon: Package,
    to: '/panel/admin/reports/inventory',
  },
  {
    slug: 'auctions',
    icon: Gavel,
    to: '/panel/admin/reports/auctions',
  },
  {
    slug: 'purchases',
    icon: ShoppingBag,
    to: '/panel/admin/reports/purchases',
  },
  {
    slug: 'marketplace',
    icon: Store,
    to: '/panel/admin/reports/marketplace',
  },
]

const categoryToKind: Record<Exclude<CategorySlug, 'financial'>, OperationalReportKind> = {
  inventory: 'inventory',
  auctions: 'auctions',
  purchases: 'purchases',
  marketplace: 'marketplace',
}

const OPERATIONAL_STATUSES: Record<string, string[]> = {
  auctions: ['open', 'finished', 'cancelled'],
  marketplace: ['for_sale', 'sold', 'cancelled', 'disputed'],
  purchases: ['completed', 'cancelled'],
}

const INVENTORY_ACTIONS = ['RETIROU_DO_JOGO', 'INSERIU_NO_JOGO', 'TROCA_ENTRE_PERSONAGENS']

type AdminT = TFunction<'admin'>

const quantity = (value: string | number) =>
  formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const dateTime = (value: string | null | undefined) => (value ? formatDateTime(value, 'short') : '—')
const dayLabel = (value: string) => value.split('-').reverse().join('/')

function statusLabel(t: AdminT, value: string) {
  return t(`reports.statusLabels.${value}`, { defaultValue: value })
}

function Metric({ label, value, detail, tone }: { label: string; value: ReactNode; detail?: string; tone?: string }) {
  return (
    <article className={`card finance-metric ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  )
}

function Status({ value, t }: { value: string; t: AdminT }) {
  return <span className={`finance-status is-${value}`}>{statusLabel(t, value)}</span>
}

function ReportsHub() {
  const { t } = useTranslation('admin')
  return (
    <div className="account-page financial-reports">
      <AdminHeader
        kicker={t('common:staff')}
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
  t,
}: {
  kind: OperationalReportKind
  params: URLSearchParams
  apply: (params: URLSearchParams) => void
  t: AdminT
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = new URLSearchParams()
    new FormData(event.currentTarget).forEach((value, key) => {
      if (String(value).trim()) next.set(key, String(value).trim())
    })
    apply(next)
  }
  const statuses = OPERATIONAL_STATUSES[kind] ?? []
  return (
    <form className="card finance-filters" onSubmit={submit}>
      <Field>
        {t('reports.username')}
        <input name="username" defaultValue={params.get('username') || ''} placeholder={t('reports.usernamePlaceholder')} maxLength={150} />
      </Field>
      <Field>
        {t('reports.dateFrom')}
        <input type="date" name="date_from" defaultValue={params.get('date_from') || ''} />
      </Field>
      <Field>
        {t('reports.dateTo')}
        <input type="date" name="date_to" defaultValue={params.get('date_to') || ''} />
      </Field>
      {kind === 'inventory' ? (
        <Field>
          {t('reports.action')}
          <select name="action" defaultValue={params.get('action') || ''}>
            <option value="">{t('common:all')}</option>
            {INVENTORY_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {statusLabel(t, action)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {statuses.length ? (
        <Field>
          {t('reports.status')}
          <select name="status" defaultValue={params.get('status') || ''}>
            <option value="">{t('common:all')}</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(t, status)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field>
        {t('reports.pageSize')}
        <select name="page_size" defaultValue={params.get('page_size') || '20'}>
          <option value="20">{t('reports.records', { count: 20 })}</option>
          <option value="50">{t('reports.records', { count: 50 })}</option>
        </select>
      </Field>
      <div className="finance-actions">
        <Button type="submit">
          <Search size={16} />
          {t('reports.applyFilters')}
        </Button>
        <Button className="secondary" type="button" onClick={() => apply(new URLSearchParams())}>
          {t('common:clear')}
        </Button>
      </div>
    </form>
  )
}

function OperationalSummary({ data, t }: { data: OperationalReport; t: AdminT }) {
  if (data.kind === 'inventory') {
    const actions = data.summary.actions as Record<string, { quantity: number; events: number }>
    return (
      <>
        <div className="finance-metrics">
          <Metric label={t('reports.inventory.moves')} value={quantity(data.summary.log_count as number)} detail={t('reports.inventory.window', { days: data.summary.window_days })} />
          <Metric label={t('reports.inventory.uniqueItems')} value={quantity(data.summary.unique_items as number)} />
          <Metric label={t('reports.inventory.users')} value={quantity(data.summary.unique_users as number)} />
        </div>
        <div className="finance-status-counts" aria-label={t('reports.inventory.actionTotals')}>
          {Object.entries(actions || {}).map(([action, row]) => (
            <span key={action}>
              <Status value={action} t={t} />
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
        <Metric label={t('reports.auctions.auctions')} value={quantity(data.summary.auction_count as number)} />
        <Metric label={t('reports.auctions.open')} value={quantity(data.summary.open_count as number)} tone="is-positive" />
        <Metric label={t('reports.auctions.finished')} value={quantity(data.summary.finished_count as number)} />
        <Metric label={t('reports.auctions.bids')} value={quantity(data.summary.bid_count as number)} />
      </div>
    )
  }
  if (data.kind === 'purchases') {
    return (
      <div className="finance-metrics">
        <Metric label={t('reports.purchases.purchases')} value={quantity(data.summary.purchase_count as number)} />
        <Metric label={t('reports.purchases.completed')} value={quantity(data.summary.completed_count as number)} tone="is-positive" />
        <Metric label={t('reports.purchases.revenue')} value={quantity(data.summary.revenue as string)} detail={t('reports.purchases.revenueDetail')} />
        <Metric label={t('reports.purchases.carts')} value={quantity(data.summary.abandoned_carts as number)} detail={t('reports.purchases.cartsDetail')} />
      </div>
    )
  }
  return (
    <div className="finance-metrics">
      <Metric label={t('reports.marketplace.listings')} value={quantity(data.summary.listing_count as number)} />
      <Metric label={t('reports.marketplace.forSale')} value={quantity(data.summary.for_sale_count as number)} tone="is-positive" />
      <Metric label={t('reports.marketplace.sold')} value={quantity(data.summary.sold_count as number)} />
      <Metric label={t('reports.marketplace.soldRevenue')} value={quantity(data.summary.sold_revenue as string)} />
    </div>
  )
}

function OperationalTable({ data, t }: { data: OperationalReport; t: AdminT }) {
  if (data.kind === 'inventory') {
    return (
      <table>
        <thead>
          <tr>
            <th>{t('reports.inventory.day')}</th>
            <th>{t('reports.inventory.quantity')}</th>
            <th>{t('reports.inventory.dayActions')}</th>
            <th>{t('reports.inventory.detail')}</th>
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
                    {statusLabel(t, action)}: {quantity(total)}
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
            <th>{t('reports.auctions.item')}</th>
            <th>{t('reports.auctions.seller')}</th>
            <th>{t('reports.auctions.currentBid')}</th>
            <th>{t('reports.auctions.bids')}</th>
            <th>{t('reports.status')}</th>
            <th>{t('reports.auctions.endsAt')}</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((row) => (
            <tr key={String(row.id)}>
              <td>
                <strong>{String(row.item_name)}</strong>
                <small>
                  {t('reports.auctions.itemDetail', {
                    enchant: quantity(row.item_enchant as number),
                    quantity: quantity(row.quantity as number),
                  })}
                </small>
              </td>
              <td>{String(row.seller || '—')}</td>
              <td>{row.current_bid != null ? quantity(row.current_bid as string) : '—'}</td>
              <td>{quantity(row.bid_count as number)}</td>
              <td>
                <Status value={String(row.status)} t={t} />
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
            <th>{t('reports.username')}</th>
            <th>{t('reports.purchases.total')}</th>
            <th>{t('reports.purchases.discount')}</th>
            <th>{t('reports.purchases.coupon')}</th>
            <th>{t('reports.status')}</th>
            <th>{t('reports.purchases.createdAt')}</th>
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
                <Status value={String(row.status)} t={t} />
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
          <th>{t('reports.marketplace.character')}</th>
          <th>{t('reports.auctions.seller')}</th>
          <th>{t('reports.marketplace.buyer')}</th>
          <th>{t('reports.marketplace.price')}</th>
          <th>{t('reports.status')}</th>
          <th>{t('reports.purchases.createdAt')}</th>
        </tr>
      </thead>
      <tbody>
        {data.results.map((row) => (
          <tr key={String(row.id)}>
            <td>
              <strong>{String(row.char_name)}</strong>
              <small>{t('reports.marketplace.characterLevel', { level: quantity(row.char_level as number) })}</small>
            </td>
            <td>{String(row.seller || '—')}</td>
            <td>{String(row.buyer || '—')}</td>
            <td>{quantity(row.price as string)}</td>
            <td>
              <Status value={String(row.status)} t={t} />
            </td>
            <td>{dateTime(row.created_at as string)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function OperationalReportPanel({ category }: { category: Exclude<CategorySlug, 'financial'> }) {
  const { t } = useTranslation('admin')
  const kind = categoryToKind[category]
  const title = t(`reports.categories.${category}.title`)
  const description = t(`reports.categories.${category}.description`)
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
      <AdminHeader kicker={t('reports.kicker')} title={title} description={description} />
      <nav className="finance-tabs" aria-label={t('reports.categoriesNav')}>
        {categories.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.slug} to={item.to} className={() => (item.slug === category ? 'is-active' : '')}>
              <Icon size={18} />
              {t(`reports.categories.${item.slug}.title`)}
            </NavLink>
          )
        })}
      </nav>
      <div className="finance-section-heading">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        <Button type="submit" className="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw size={16} />
          {query.isFetching ? t('reports.refreshing') : t('reports.refresh')}
        </Button>
      </div>
      <OperationalFilters key={`${kind}:${params}`} kind={kind} params={params} apply={setParams} t={t} />
      {query.isPending && (
        <Card className="finance-empty" role="status">
          {t('reports.loading')}
        </Card>
      )}
      {query.isError && (
        <Card className="finance-error" role="alert">
          <strong>{t('reports.loadError')}</strong>
          <p>{isApiError(query.error) ? query.error.message : t('reports.tryAgain')}</p>
          <Button type="submit" className="secondary" onClick={() => void query.refetch()}>
            {t('common:retry')}
          </Button>
        </Card>
      )}
      {data && !query.isError ? (
        <>
          <OperationalSummary data={data} t={t} />
          <Card className="finance-results" aria-busy={query.isFetching}>
            <div className="finance-section-heading">
              <div>
                <h3>{t('reports.detail')}</h3>
                <p className="muted">
                  {t('reports.detailHint', { count: data.count })}
                </p>
              </div>
            </div>
            {data.results.length ? (
              <div className="finance-table" tabIndex={0} role="region" aria-label={t('reports.tableLabel', { title })}>
                <OperationalTable data={data} t={t} />
              </div>
            ) : (
              <div className="finance-empty">
                <Search size={28} />
                <h3>{t('reports.emptyTitle')}</h3>
                <p className="muted">{t('reports.emptyHint')}</p>
              </div>
            )}
            <div className="finance-pagination">
              <span>{t('common:pageOf', { page, total: data.total_pages })}</span>
              <div>
                <Button type="submit" className="secondary" disabled={!data.previous || query.isFetching} onClick={() => changePage(page - 1)}>
                  {t('common:previous')}
                </Button>
                <Button type="submit" className="secondary" disabled={!data.next || query.isFetching} onClick={() => changePage(page + 1)}>
                  {t('common:next')}
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
  if (category === 'financial') {
    if (!report) return <Navigate to="/panel/admin/reports/financial/balances" replace />
    return <AdminFinancialReportsPage />
  }
  if (category in categoryToKind) {
    return <OperationalReportPanel category={category as Exclude<CategorySlug, 'financial'>} />
  }
  return <Navigate to="/panel/admin/reports" replace />
}

export function AdminFinancialReportsRedirect() {
  const { report } = useParams()
  const [params] = useSearchParams()
  const search = params.toString()
  const reportMap: Record<string, string> = {
    saldos: 'balances',
    'fluxo-caixa': 'cash-flow',
    pagamentos: 'payments',
    reconciliacao: 'reconciliation',
  }
  const mapped = report ? reportMap[report] ?? report : 'balances'
  return <Navigate to={`/panel/admin/reports/financial/${mapped}${search ? `?${search}` : ''}`} replace />
}
