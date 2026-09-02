import { type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, ReceiptText, RefreshCw, Scale, Search, Wallet } from 'lucide-react'
import { isApiError } from '../../services/api'
import {
  financialReportsApi,
  type FinancialReport,
  type FinancialReportKind,
  type BalanceReportRow,
} from '../../services/domain/financial-reports.service'
import { AdminHeader } from './AdminChrome'
import './financial-reports.css'

const reports = [
  { slug: 'saldos', kind: 'balances', title: 'Saldos dos usuários', icon: Wallet, description: 'Saldos disponíveis, bônus e consistência do histórico de cada usuário.' },
  { slug: 'fluxo-caixa', kind: 'cash-flow', title: 'Fluxo de caixa', icon: ChartNoAxesCombined, description: 'Entradas e saídas diárias nas carteiras, com saldo acumulado no período.' },
  { slug: 'pagamentos', kind: 'payments', title: 'Pedidos e pagamentos', icon: ReceiptText, description: 'Pedidos, valores confirmados e moedas creditadas, separados por moeda de pagamento.' },
  { slug: 'reconciliacao', kind: 'reconciliation', title: 'Reconciliação', icon: Scale, description: 'Compare o saldo atual das carteiras com as entradas e saídas registradas.' },
] satisfies { slug: string; kind: FinancialReportKind; title: string; icon: typeof Wallet; description: string }[]

const statusLabels: Record<string, string> = {
  consistent: 'Consistente', review: 'Em análise', discrepancy: 'Divergência', no_wallet: 'Sem carteira',
  pending: 'Pendente', processing: 'Processando', confirmed: 'Confirmado', cancelled: 'Cancelado', failed: 'Falhou',
}
const methodLabels: Record<string, string> = { mercadopago: 'Mercado Pago', stripe: 'Stripe', mock: 'Simulação' }
const sourceLabels = { simulation: 'Simulação', gateway: 'Provedor', unidentified: 'Não identificada' }
const numberFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const quantity = (value: string | number) => numberFormat.format(Number(value))
const money = (value: string, currency: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value))
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '—'
const dayLabel = (value: string) => value.split('-').reverse().join('/')

function Status({ value }: { value: string }) {
  return <span className={`finance-status is-${value}`}>{statusLabels[value] || value}</span>
}

function Metric({ label, value, detail, tone }: { label: string; value: ReactNode; detail?: string; tone?: string }) {
  return <article className={`card finance-metric ${tone || ''}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>
}

function ReportSummary({ data }: { data: FinancialReport }) {
  if (data.kind === 'payments') {
    return <>
      <div className="finance-metrics">
        <Metric label="Pedidos encontrados" value={data.count.toLocaleString('pt-BR')} detail="Todos os pedidos dos filtros aplicados" />
        <Metric label="Moedas creditadas" value={quantity(data.summary.total_credited)} detail="Pedidos confirmados, incluindo bônus" tone="is-positive" />
        <Metric label="Bônus creditados" value={quantity(data.summary.bonus_applied)} detail="Incluídos no total de moedas creditadas" />
      </div>
      <div className="finance-metrics">
        {data.summary.currencies.map((item) => <article className="card finance-currency" key={item.currency}>
          <span className="panel-eyebrow">{item.currency === 'BRL' ? 'Reais · BRL' : 'Dólares · USD'}</span>
          <strong>{money(item.confirmed_amount, item.currency)}</strong><span>Confirmado</span>
          <dl><div><dt>Pendente / processando</dt><dd>{money(item.pending_amount, item.currency)}</dd></div><div><dt>Valor de todos os pedidos</dt><dd>{money(item.total_amount, item.currency)}</dd></div><div><dt>Pedidos</dt><dd>{item.count}</dd></div></dl>
        </article>)}
      </div>
      <StatusCounts statuses={data.summary.statuses} />
    </>
  }
  if (data.kind === 'cash-flow') {
    return <div className="finance-metrics">
      <Metric label="Entradas" value={quantity(data.summary.credits)} detail="Moedas, incluindo bônus" tone="is-positive" />
      <Metric label="Saídas" value={quantity(data.summary.debits)} detail="Moedas debitadas das carteiras" tone="is-negative" />
      <Metric label="Saldo do período" value={quantity(data.summary.net)} detail="Entradas menos saídas" />
      <Metric label="Movimentações" value={data.summary.transaction_count.toLocaleString('pt-BR')} detail={`${data.summary.days} dias com movimentação`} />
    </div>
  }
  return <>
    <div className="finance-metrics">
      <Metric label="Saldo total" value={quantity(data.summary.total_balance)} detail={`Principal: ${quantity(data.summary.balance)} · Bônus: ${quantity(data.summary.bonus_balance)}`} />
      <Metric label="Saldo pelo histórico" value={quantity(data.summary.calculated_balance)} detail="Entradas menos saídas, incluindo bônus" />
      <Metric label="Diferença líquida" value={quantity(data.summary.difference)} detail={`Diferenças absolutas: ${quantity(data.summary.absolute_difference)}`} tone={Number(data.summary.absolute_difference) > 0.01 ? 'is-negative' : 'is-positive'} />
      <Metric label={data.kind === 'balances' ? 'Usuários' : 'Carteiras'} value={data.count.toLocaleString('pt-BR')} detail={`${data.summary.transaction_count.toLocaleString('pt-BR')} movimentações no histórico`} />
    </div>
    <StatusCounts statuses={data.summary.statuses} />
  </>
}

function StatusCounts({ statuses }: { statuses: Record<string, number> }) {
  return <div className="finance-status-counts" aria-label="Totais por situação">{Object.entries(statuses).map(([status, count]) => <span key={status}><Status value={status} /><b>{count}</b></span>)}</div>
}

function Filters({ kind, params, apply }: { kind: FinancialReportKind; params: URLSearchParams; apply: (params: URLSearchParams) => void }) {
  const dated = kind === 'payments' || kind === 'cash-flow'
  const statuses = kind === 'payments' ? ['pending', 'processing', 'confirmed', 'cancelled', 'failed']
    : kind === 'reconciliation' ? ['consistent', 'review', 'discrepancy'] : ['consistent', 'review', 'discrepancy', 'no_wallet']
  const rangeLabel = kind === 'payments' ? 'Valor do pedido' : kind === 'reconciliation' ? 'Diferença' : 'Saldo total'
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = new URLSearchParams()
    new FormData(event.currentTarget).forEach((value, key) => { if (String(value).trim()) next.set(key, String(value).trim()) })
    apply(next)
  }
  return <form className="card finance-filters" onSubmit={submit}>
    <label className="field">Usuário<input name="username" defaultValue={params.get('username') || ''} placeholder="Buscar pelo nome" maxLength={150} /></label>
    {dated && <><label className="field">Data inicial<input type="date" name="date_from" defaultValue={params.get('date_from') || ''} /></label><label className="field">Data final<input type="date" name="date_to" defaultValue={params.get('date_to') || ''} /></label></>}
    {kind !== 'cash-flow' && <label className="field">Situação<select name="status" defaultValue={params.get('status') || ''}><option value="">Todas</option>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>}
    {kind === 'payments' && <>
      <label className="field">Método<input name="method" list="finance-methods" defaultValue={params.get('method') || ''} placeholder="Todos os métodos" maxLength={20} /><datalist id="finance-methods">{Object.entries(methodLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</datalist></label>
      <label className="field">Moeda<select name="currency" defaultValue={params.get('currency') || ''}><option value="">Todas</option><option value="BRL">Real (BRL)</option><option value="USD">Dólar (USD)</option></select></label>
    </>}
    {kind !== 'cash-flow' && <><label className="field">{rangeLabel} mínimo<input type="number" step="0.01" name="minimum" defaultValue={params.get('minimum') || ''} placeholder="Sem limite" /></label><label className="field">{rangeLabel} máximo<input type="number" step="0.01" name="maximum" defaultValue={params.get('maximum') || ''} placeholder="Sem limite" /></label></>}
    <label className="field">Por página<select name="page_size" defaultValue={params.get('page_size') || '20'}><option value="20">20 registros</option><option value="50">50 registros</option></select></label>
    <div className="finance-actions"><button className="btn" type="submit"><Search size={16} />Aplicar filtros</button><button className="btn secondary" type="button" onClick={() => apply(new URLSearchParams())}>Limpar</button></div>
  </form>
}

function BalanceRows({ rows, reconciliation }: { rows: BalanceReportRow[]; reconciliation: boolean }) {
  return <table><thead><tr><th>Usuário</th><th>Principal</th><th>Bônus</th><th>Total</th>{reconciliation && <><th>Entradas</th><th>Saídas</th></>}<th>Pelo histórico</th><th>Diferença</th><th>Situação</th><th>Movimentações</th><th>Última transação</th></tr></thead><tbody>
    {rows.map((row) => <tr key={row.username}><td><strong>{row.username}</strong></td><td>{quantity(row.balance)}</td><td>{quantity(row.bonus_balance)}</td><td>{quantity(row.total_balance)}</td>{reconciliation && <><td>{quantity(row.credits)}</td><td>{quantity(row.debits)}</td></>}<td>{quantity(row.calculated_balance)}</td><td className={Math.abs(Number(row.difference)) > 0.01 ? 'finance-warning' : ''}>{quantity(row.difference)}</td><td><Status value={row.report_status} /></td><td>{row.transaction_count}<small>{row.credit_count} entradas · {row.debit_count} saídas</small></td><td>{dateTime(row.last_transaction)}<small>Primeira: {dateTime(row.first_transaction)}</small></td></tr>)}
  </tbody></table>
}

function ReportTable({ data }: { data: FinancialReport }) {
  if (data.kind === 'payments') return <table><thead><tr><th>Pedido / usuário</th><th>Valor</th><th>Moedas base</th><th>Bônus</th><th>Creditado</th><th>Situação</th><th>Método / origem</th><th>Criado em</th><th>Pago em</th></tr></thead><tbody>
    {data.results.map((row) => <tr key={row.id}><td><strong>{row.username}</strong><small className="finance-order-id">{row.id}</small></td><td>{money(row.amount, row.currency)}<small>{row.currency}</small></td><td>{quantity(row.coins)}</td><td>{quantity(row.bonus_applied)}</td><td>{quantity(row.total_credited)}</td><td><Status value={row.status} /></td><td>{methodLabels[row.method] || row.method}<small>{sourceLabels[row.payment_source]}</small></td><td>{dateTime(row.created_at)}</td><td>{dateTime(row.paid_at)}</td></tr>)}
  </tbody></table>
  if (data.kind === 'cash-flow') return <table><thead><tr><th>Dia</th><th>Entradas</th><th>Saídas</th><th>Saldo do dia</th><th>Acumulado no período</th><th>Movimentações</th></tr></thead><tbody>
    {data.results.map((row) => <tr key={row.day}><td>{dayLabel(row.day)}</td><td className="finance-positive">{quantity(row.credits)}</td><td>{quantity(row.debits)}</td><td>{quantity(row.net)}</td><td>{quantity(row.accumulated)}</td><td>{row.transaction_count}<small>{row.credit_count} entradas · {row.debit_count} saídas</small></td></tr>)}
  </tbody></table>
  return <BalanceRows rows={data.results} reconciliation={data.kind === 'reconciliation'} />
}

function CashFlowChart({ data }: { data: Extract<FinancialReport, { kind: 'cash-flow' }> }) {
  const rows = [...data.results].reverse()
  const max = Math.max(1, ...rows.flatMap((row) => [Number(row.credits), Number(row.debits)]))
  return <section className="card finance-chart"><div className="finance-section-heading"><div><h3>Movimentação diária</h3><p className="muted">Dias desta página, em ordem cronológica · moedas</p></div><div className="finance-chart-legend"><span><ArrowDownLeft size={14} />Entradas</span><span><ArrowUpRight size={14} />Saídas</span></div></div>
    <div className="finance-chart-scroll"><div className="finance-bars" role="img" aria-label="Entradas e saídas por dia. Valores disponíveis na tabela abaixo.">
      {rows.map((row) => <div className="finance-bar-day" key={row.day}><div className="finance-bar-pair" title={`${dayLabel(row.day)}: entradas ${quantity(row.credits)}, saídas ${quantity(row.debits)}`}><span style={{ height: `${Number(row.credits) / max * 100}%` }} /><span style={{ height: `${Number(row.debits) / max * 100}%` }} /></div><small>{dayLabel(row.day).slice(0, 5)}</small></div>)}
    </div></div>
  </section>
}

export function AdminFinancialReportsPage() {
  const { report = 'saldos' } = useParams()
  const selected = reports.find((item) => item.slug === report)
  const kind = selected?.kind || 'balances'
  const [params, setParams] = useSearchParams()
  const query = useQuery({
    queryKey: ['staff-financial-report', kind, params.toString()],
    queryFn: ({ signal }) => financialReportsApi.get(kind, params, signal),
    enabled: Boolean(selected),
  })
  if (!selected) return <Navigate to="/painel/admin/financeiro/saldos" replace />
  function changePage(page: number) { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next) }
  const page = Number(params.get('page') || 1)
  const data = query.data
  return <div className="account-page financial-reports">
    <AdminHeader kicker="Financeiro" title="Relatórios financeiros" description="Acompanhe pagamentos, movimentações e a integridade das carteiras do painel." />
    <nav className="finance-tabs" aria-label="Relatórios financeiros">{reports.map((item) => { const Icon = item.icon; return <NavLink key={item.slug} to={`/painel/admin/financeiro/${item.slug}`} className={() => item.kind === kind ? 'is-active' : ''}><Icon size={18} />{item.title}</NavLink> })}</nav>
    <div className="finance-section-heading"><div><h2>{selected.title}</h2><p className="muted">{selected.description}</p></div><button className="btn secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />{query.isFetching ? 'Atualizando…' : 'Atualizar'}</button></div>
    <Filters key={`${kind}:${params}`} kind={kind} params={params} apply={setParams} />
    <p className="finance-explanation">{kind === 'payments'
      ? 'Período pela data de criação do pedido. Totais em BRL e USD são independentes. Moedas e bônus creditados consideram apenas pedidos confirmados; simulações são identificadas na origem.'
      : kind === 'cash-flow'
        ? 'Valores em moedas da carteira. Inclui bônus e transferências internas; não representa receita em dinheiro. O acumulado começa em zero no início do período filtrado.'
        : 'Valores em moedas da carteira. Saldo total = principal + bônus; saldo pelo histórico = entradas − saídas. Diferenças até 0,01 são consistentes; até 1,00 ficam em análise. A consulta não altera saldos.'}</p>
    {query.isPending && <section className="card finance-empty" role="status">Carregando relatório…</section>}
    {query.isError && <section className="card finance-error" role="alert"><strong>Não foi possível carregar o relatório.</strong><p>{isApiError(query.error) ? query.error.message : 'Tente novamente.'}</p>{isApiError(query.error) && Object.entries(query.error.details).map(([key, value]) => <p key={key}>{key}: {typeof value === 'string' ? value : JSON.stringify(value)}</p>)}<button className="btn secondary" onClick={() => void query.refetch()}>Tentar novamente</button></section>}
    {data && !query.isError && <>
      <ReportSummary data={data} />
      {data.kind === 'cash-flow' && data.results.length > 0 && <CashFlowChart data={data} />}
      <section className="card finance-results" aria-busy={query.isFetching}>
        <div className="finance-section-heading"><div><h3>Detalhamento</h3><p className="muted">{data.count.toLocaleString('pt-BR')} registros · Totais calculados sobre todos os resultados dos filtros.</p></div></div>
        {data.results.length ? <div className="finance-table" tabIndex={0} role="region" aria-label={`Tabela: ${selected.title}`}><ReportTable data={data} /></div> : <div className="finance-empty"><Search size={28} /><h3>Nenhum registro encontrado</h3><p className="muted">Ajuste os filtros ou consulte novamente após novas movimentações.</p></div>}
        <div className="finance-pagination"><span>Página {page} de {data.total_pages}</span><div><button className="btn secondary" disabled={!data.previous || query.isFetching} onClick={() => changePage(page - 1)}>Anterior</button><button className="btn secondary" disabled={!data.next || query.isFetching} onClick={() => changePage(page + 1)}>Próxima</button></div></div>
      </section>
    </>}
  </div>
}
