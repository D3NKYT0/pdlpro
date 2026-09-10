import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, ReceiptText, RefreshCw, Scale, Search, Wallet } from 'lucide-react'
import {
  financialReportsApi,
  isApiError,
  type FinancialReport,
  type FinancialReportKind,
  type BalanceReportRow,
} from '../../services/api'
import { formatCurrency, formatDateTime, formatNumber } from '../../lib/formatters'
import { AdminHeader } from './AdminChrome'
import './financial-reports.css'

type AdminT = TFunction<'admin'>

const reports = [
  { slug: 'balances', kind: 'balances', labelKey: 'balances', icon: Wallet },
  { slug: 'cash-flow', kind: 'cash-flow', labelKey: 'cashFlow', icon: ChartNoAxesCombined },
  { slug: 'payments', kind: 'payments', labelKey: 'payments', icon: ReceiptText },
  { slug: 'reconciliation', kind: 'reconciliation', labelKey: 'reconciliation', icon: Scale },
] satisfies { slug: string; kind: FinancialReportKind; labelKey: string; icon: typeof Wallet }[]

const quantity = (value: string | number) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const count = (value: number) => formatNumber(value)
const money = (value: string, currency: string) => formatCurrency(value, currency)
const dateTime = (value: string | null) => (value ? formatDateTime(value, 'short') : '—')
const dayLabel = (value: string) => value.split('-').reverse().join('/')

function Status({ value, t }: { value: string; t: AdminT }) {
  return <span className={`finance-status is-${value}`}>{t(`reports.finance.statusLabels.${value}`, { defaultValue: value })}</span>
}

function Metric({ label, value, detail, tone }: { label: string; value: ReactNode; detail?: string; tone?: string }) {
  return <article className={`card finance-metric ${tone || ''}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>
}

function ReportSummary({ data, t }: { data: FinancialReport; t: AdminT }) {
  if (data.kind === 'payments') {
    return <>
      <div className="finance-metrics">
        <Metric label={t('reports.finance.metrics.ordersFound')} value={count(data.count)} detail={t('reports.finance.metrics.ordersFoundDetail')} />
        <Metric label={t('reports.finance.metrics.coinsCredited')} value={quantity(data.summary.total_credited)} detail={t('reports.finance.metrics.coinsCreditedDetail')} tone="is-positive" />
        <Metric label={t('reports.finance.metrics.bonusCredited')} value={quantity(data.summary.bonus_applied)} detail={t('reports.finance.metrics.bonusCreditedDetail')} />
      </div>
      <div className="finance-metrics">
        {data.summary.currencies.map((item) => <Card as="article" className="finance-currency" key={item.currency}>
          <span className="panel-eyebrow">{item.currency === 'BRL' ? t('reports.finance.currencies.brl') : t('reports.finance.currencies.usd')}</span>
          <strong>{money(item.confirmed_amount, item.currency)}</strong><span>{t('reports.finance.currencies.confirmed')}</span>
          <dl><div><dt>{t('reports.finance.currencies.pending')}</dt><dd>{money(item.pending_amount, item.currency)}</dd></div><div><dt>{t('reports.finance.currencies.totalAmount')}</dt><dd>{money(item.total_amount, item.currency)}</dd></div><div><dt>{t('reports.finance.currencies.orders')}</dt><dd>{item.count}</dd></div></dl>
        </Card>)}
      </div>
      <StatusCounts statuses={data.summary.statuses} t={t} />
    </>
  }
  if (data.kind === 'cash-flow') {
    return <div className="finance-metrics">
      <Metric label={t('reports.finance.metrics.credits')} value={quantity(data.summary.credits)} detail={t('reports.finance.metrics.creditsDetail')} tone="is-positive" />
      <Metric label={t('reports.finance.metrics.debits')} value={quantity(data.summary.debits)} detail={t('reports.finance.metrics.debitsDetail')} tone="is-negative" />
      <Metric label={t('reports.finance.metrics.net')} value={quantity(data.summary.net)} detail={t('reports.finance.metrics.netDetail')} />
      <Metric label={t('reports.finance.metrics.transactions')} value={count(data.summary.transaction_count)} detail={t('reports.finance.metrics.transactionsDetail', { days: data.summary.days })} />
    </div>
  }
  return <>
    <div className="finance-metrics">
      <Metric label={t('reports.finance.metrics.totalBalance')} value={quantity(data.summary.total_balance)} detail={t('reports.finance.metrics.totalBalanceDetail', { balance: quantity(data.summary.balance), bonus: quantity(data.summary.bonus_balance) })} />
      <Metric label={t('reports.finance.metrics.calculatedBalance')} value={quantity(data.summary.calculated_balance)} detail={t('reports.finance.metrics.calculatedBalanceDetail')} />
      <Metric label={t('reports.finance.metrics.difference')} value={quantity(data.summary.difference)} detail={t('reports.finance.metrics.differenceDetail', { value: quantity(data.summary.absolute_difference) })} tone={Number(data.summary.absolute_difference) > 0.01 ? 'is-negative' : 'is-positive'} />
      <Metric label={data.kind === 'balances' ? t('reports.finance.metrics.users') : t('reports.finance.metrics.wallets')} value={count(data.count)} detail={t('reports.finance.metrics.historyDetail', { value: count(data.summary.transaction_count) })} />
    </div>
    <StatusCounts statuses={data.summary.statuses} t={t} />
  </>
}

function StatusCounts({ statuses, t }: { statuses: Record<string, number>; t: AdminT }) {
  return <div className="finance-status-counts" aria-label={t('reports.finance.statusTotals')}>{Object.entries(statuses).map(([status, value]) => <span key={status}><Status value={status} t={t} /><b>{value}</b></span>)}</div>
}

function Filters({ kind, params, apply, t }: { kind: FinancialReportKind; params: URLSearchParams; apply: (params: URLSearchParams) => void; t: AdminT }) {
  const dated = kind === 'payments' || kind === 'cash-flow'
  const statuses = kind === 'payments' ? ['pending', 'processing', 'confirmed', 'cancelled', 'failed']
    : kind === 'reconciliation' ? ['consistent', 'review', 'discrepancy'] : ['consistent', 'review', 'discrepancy', 'no_wallet']
  const rangeLabel = kind === 'payments' ? t('reports.finance.filters.ranges.payments') : kind === 'reconciliation' ? t('reports.finance.filters.ranges.reconciliation') : t('reports.finance.filters.ranges.balances')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = new URLSearchParams()
    new FormData(event.currentTarget).forEach((value, key) => { if (String(value).trim()) next.set(key, String(value).trim()) })
    apply(next)
  }
  return <form className="card finance-filters" onSubmit={submit}>
    <Field>{t('reports.username')}<input name="username" defaultValue={params.get('username') || ''} placeholder={t('reports.usernamePlaceholder')} maxLength={150} /></Field>
    {dated && <><Field>{t('reports.dateFrom')}<input type="date" name="date_from" defaultValue={params.get('date_from') || ''} /></Field><Field>{t('reports.dateTo')}<input type="date" name="date_to" defaultValue={params.get('date_to') || ''} /></Field></>}
    {kind !== 'cash-flow' && <Field>{t('reports.status')}<select name="status" defaultValue={params.get('status') || ''}><option value="">{t('common:all')}</option>{statuses.map((status) => <option key={status} value={status}>{t(`reports.finance.statusLabels.${status}`)}</option>)}</select></Field>}
    {kind === 'payments' && <>
      <Field>{t('reports.finance.filters.method')}<input name="method" list="finance-methods" defaultValue={params.get('method') || ''} placeholder={t('reports.finance.filters.methodPlaceholder')} maxLength={20} /><datalist id="finance-methods">{['mercadopago', 'stripe', 'mock'].map((key) => <option key={key} value={key}>{t(`reports.finance.methods.${key}`)}</option>)}</datalist></Field>
      <Field>{t('reports.finance.filters.currency')}<select name="currency" defaultValue={params.get('currency') || ''}><option value="">{t('common:all')}</option><option value="BRL">{t('reports.finance.filters.currencyBRL')}</option><option value="USD">{t('reports.finance.filters.currencyUSD')}</option></select></Field>
    </>}
    {kind !== 'cash-flow' && <><Field>{t('reports.finance.filters.minimum', { label: rangeLabel })}<input type="number" step="0.01" name="minimum" defaultValue={params.get('minimum') || ''} placeholder={t('reports.finance.filters.noLimit')} /></Field><Field>{t('reports.finance.filters.maximum', { label: rangeLabel })}<input type="number" step="0.01" name="maximum" defaultValue={params.get('maximum') || ''} placeholder={t('reports.finance.filters.noLimit')} /></Field></>}
    <Field>{t('reports.pageSize')}<select name="page_size" defaultValue={params.get('page_size') || '20'}><option value="20">{t('reports.records', { count: 20 })}</option><option value="50">{t('reports.records', { count: 50 })}</option></select></Field>
    <div className="finance-actions"><Button type="submit"><Search size={16} />{t('reports.applyFilters')}</Button><Button className="secondary" type="button" onClick={() => apply(new URLSearchParams())}>{t('common:clear')}</Button></div>
  </form>
}

function BalanceRows({ rows, reconciliation, t }: { rows: BalanceReportRow[]; reconciliation: boolean; t: AdminT }) {
  return <table><thead><tr><th>{t('reports.finance.tables.user')}</th><th>{t('reports.finance.tables.principal')}</th><th>{t('reports.finance.tables.bonus')}</th><th>{t('reports.finance.tables.total')}</th>{reconciliation && <><th>{t('reports.finance.tables.credits')}</th><th>{t('reports.finance.tables.debits')}</th></>}<th>{t('reports.finance.tables.byHistory')}</th><th>{t('reports.finance.tables.difference')}</th><th>{t('reports.finance.tables.status')}</th><th>{t('reports.finance.tables.transactions')}</th><th>{t('reports.finance.tables.lastTransaction')}</th></tr></thead><tbody>
    {rows.map((row) => <tr key={row.username}><td><strong>{row.username}</strong></td><td>{quantity(row.balance)}</td><td>{quantity(row.bonus_balance)}</td><td>{quantity(row.total_balance)}</td>{reconciliation && <><td>{quantity(row.credits)}</td><td>{quantity(row.debits)}</td></>}<td>{quantity(row.calculated_balance)}</td><td className={Math.abs(Number(row.difference)) > 0.01 ? 'finance-warning' : ''}>{quantity(row.difference)}</td><td><Status value={row.report_status} t={t} /></td><td>{row.transaction_count}<small>{t('reports.finance.tables.transactionSplit', { credits: row.credit_count, debits: row.debit_count })}</small></td><td>{dateTime(row.last_transaction)}<small>{t('reports.finance.tables.firstTransaction', { date: dateTime(row.first_transaction) })}</small></td></tr>)}
  </tbody></table>
}

function ReportTable({ data, t }: { data: FinancialReport; t: AdminT }) {
  if (data.kind === 'payments') return <table><thead><tr><th>{t('reports.finance.tables.orderUser')}</th><th>{t('reports.finance.tables.amount')}</th><th>{t('reports.finance.tables.baseCoins')}</th><th>{t('reports.finance.tables.bonus')}</th><th>{t('reports.finance.tables.credited')}</th><th>{t('reports.finance.tables.status')}</th><th>{t('reports.finance.tables.methodSource')}</th><th>{t('reports.finance.tables.createdAt')}</th><th>{t('reports.finance.tables.paidAt')}</th></tr></thead><tbody>
    {data.results.map((row) => <tr key={row.id}><td><strong>{row.username}</strong><small className="finance-order-id">{row.id}</small></td><td>{money(row.amount, row.currency)}<small>{row.currency}</small></td><td>{quantity(row.coins)}</td><td>{quantity(row.bonus_applied)}</td><td>{quantity(row.total_credited)}</td><td><Status value={row.status} t={t} /></td><td>{t(`reports.finance.methods.${row.method}`, { defaultValue: row.method })}<small>{t(`reports.finance.sources.${row.payment_source}`)}</small></td><td>{dateTime(row.created_at)}</td><td>{dateTime(row.paid_at)}</td></tr>)}
  </tbody></table>
  if (data.kind === 'cash-flow') return <table><thead><tr><th>{t('reports.finance.tables.day')}</th><th>{t('reports.finance.tables.credits')}</th><th>{t('reports.finance.tables.debits')}</th><th>{t('reports.finance.tables.dayNet')}</th><th>{t('reports.finance.tables.accumulated')}</th><th>{t('reports.finance.tables.transactions')}</th></tr></thead><tbody>
    {data.results.map((row) => <tr key={row.day}><td>{dayLabel(row.day)}</td><td className="finance-positive">{quantity(row.credits)}</td><td>{quantity(row.debits)}</td><td>{quantity(row.net)}</td><td>{quantity(row.accumulated)}</td><td>{row.transaction_count}<small>{t('reports.finance.tables.transactionSplit', { credits: row.credit_count, debits: row.debit_count })}</small></td></tr>)}
  </tbody></table>
  return <BalanceRows rows={data.results} reconciliation={data.kind === 'reconciliation'} t={t} />
}

function CashFlowChart({ data, t }: { data: Extract<FinancialReport, { kind: 'cash-flow' }>; t: AdminT }) {
  const rows = [...data.results].reverse()
  const max = Math.max(1, ...rows.flatMap((row) => [Number(row.credits), Number(row.debits)]))
  return <Card className="finance-chart"><div className="finance-section-heading"><div><h3>{t('reports.finance.chart.title')}</h3><p className="muted">{t('reports.finance.chart.description')}</p></div><div className="finance-chart-legend"><span><ArrowDownLeft size={14} />{t('reports.finance.chart.credits')}</span><span><ArrowUpRight size={14} />{t('reports.finance.chart.debits')}</span></div></div>
    <div className="finance-chart-scroll"><div className="finance-bars" role="img" aria-label={t('reports.finance.chart.aria')}>
      {rows.map((row) => <div className="finance-bar-day" key={row.day}><div className="finance-bar-pair" title={t('reports.finance.chart.barTitle', { day: dayLabel(row.day), credits: quantity(row.credits), debits: quantity(row.debits) })}><span style={{ height: `${Number(row.credits) / max * 100}%` }} /><span style={{ height: `${Number(row.debits) / max * 100}%` }} /></div><small>{dayLabel(row.day).slice(0, 5)}</small></div>)}
    </div></div>
  </Card>
}

export function AdminFinancialReportsPage() {
  const { t } = useTranslation('admin')
  const { report = 'balances' } = useParams()
  const selected = reports.find((item) => item.slug === report)
  const kind = selected?.kind || 'balances'
  const [params, setParams] = useSearchParams()
  const query = useQuery({
    queryKey: ['staff-financial-report', kind, params.toString()],
    queryFn: ({ signal }) => financialReportsApi.get(kind, params, signal),
    enabled: Boolean(selected),
  })
  if (!selected) return <Navigate to="/panel/admin/reports/financial/balances" replace />
  function changePage(page: number) { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next) }
  const page = Number(params.get('page') || 1)
  const data = query.data
  const selectedTitle = t(`reports.finance.${selected.labelKey}`)
  const selectedDescription = t(`reports.finance.descriptions.${selected.labelKey}`)
  return <div className="account-page financial-reports">
    <AdminHeader kicker={t('reports.kicker')} title={t('reports.finance.title')} description={t('reports.finance.description')} />
    <nav className="finance-tabs" aria-label={t('reports.finance.navLabel')}>{reports.map((item) => { const Icon = item.icon; return <NavLink key={item.slug} to={`/panel/admin/reports/financial/${item.slug}`} className={() => item.kind === kind ? 'is-active' : ''}><Icon size={18} />{t(`reports.finance.${item.labelKey}`)}</NavLink> })}</nav>
    <div className="finance-section-heading"><div><h2>{selectedTitle}</h2><p className="muted">{selectedDescription}</p></div><Button type="submit" className="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />{query.isFetching ? t('reports.refreshing') : t('reports.refresh')}</Button></div>
    <Filters key={`${kind}:${params}`} kind={kind} params={params} apply={setParams} t={t} />
    <p className="finance-explanation">{kind === 'payments'
      ? t('reports.finance.explanations.payments')
      : kind === 'cash-flow'
        ? t('reports.finance.explanations.cashFlow')
        : t('reports.finance.explanations.balances')}</p>
    {query.isPending && <Card className="finance-empty" role="status">{t('reports.loading')}</Card>}
    {query.isError && <Card className="finance-error" role="alert"><strong>{t('reports.loadError')}</strong><p>{isApiError(query.error) ? query.error.message : t('reports.tryAgain')}</p>{isApiError(query.error) && Object.entries(query.error.details).map(([key, value]) => <p key={key}>{key}: {typeof value === 'string' ? value : JSON.stringify(value)}</p>)}<Button type="submit" className="secondary" onClick={() => void query.refetch()}>{t('common:retry')}</Button></Card>}
    {data && !query.isError && <>
      <ReportSummary data={data} t={t} />
      {data.kind === 'cash-flow' && data.results.length > 0 && <CashFlowChart data={data} t={t} />}
      <Card className="finance-results" aria-busy={query.isFetching}>
        <div className="finance-section-heading"><div><h3>{t('reports.detail')}</h3><p className="muted">{t('reports.detailHint', { count: data.count })}</p></div></div>
        {data.results.length ? <div className="finance-table" tabIndex={0} role="region" aria-label={t('reports.tableLabel', { title: selectedTitle })}><ReportTable data={data} t={t} /></div> : <div className="finance-empty"><Search size={28} /><h3>{t('reports.emptyTitle')}</h3><p className="muted">{t('reports.emptyHint')}</p></div>}
        <div className="finance-pagination"><span>{t('common:pageOf', { page, total: data.total_pages })}</span><div><Button type="submit" className="secondary" disabled={!data.previous || query.isFetching} onClick={() => changePage(page - 1)}>{t('common:previous')}</Button><Button type="submit" className="secondary" disabled={!data.next || query.isFetching} onClick={() => changePage(page + 1)}>{t('common:next')}</Button></div></div>
      </Card>
    </>}
  </div>
}
