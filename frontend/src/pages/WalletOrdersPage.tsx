import { Card } from '../components/ui/Card'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState, LoadingState } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CircleDollarSign, ReceiptText } from 'lucide-react'
import { paymentApi } from '../services/api'
import type { ApiPaymentOrder } from '../services/types'
import { formatWalletMoney, getOrderStatus, orderDetailEntries } from './walletHistory'

export function WalletOrdersPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ApiPaymentOrder | null>(null)
  const orders = useQuery({
    queryKey: ['payments', page],
    queryFn: () => paymentApi.list({ page, page_size: 20 }),
  })
  const results = orders.data?.results ?? []
  const pages = Math.max(1, orders.data?.total_pages ?? 1)

  return (
    <div className="wallet-page wallet-history-page">
      <div className="program-actions">
        <ButtonLink to="/painel/wallet" variant="ghost" size="sm">
          <ArrowLeft aria-hidden="true" /> Voltar à carteira
        </ButtonLink>
      </div>
      <Card className="wallet-history-card">
        <header className="wallet-activity-heading">
          <span className="wallet-section-icon" aria-hidden="true"><ReceiptText /></span>
          <div>
            <span className="panel-eyebrow">Recargas</span>
            <h1>Pedidos</h1>
          </div>
          <b>{orders.data?.count ?? 0}</b>
        </header>
        {orders.isLoading ? <LoadingState /> : null}
        {!orders.isLoading && !results.length ? (
          <EmptyState>Nenhum pedido de recarga encontrado.</EmptyState>
        ) : null}
        {results.length ? (
          <div className="wallet-activity-list is-expanded">
            {results.map((row) => {
              const status = getOrderStatus(row.status)
              const currency = row.currency === 'USD' ? 'USD' : 'BRL'
              return (
                <button
                  type="button"
                  className="wallet-activity-item"
                  key={row.id}
                  onClick={() => setSelected(row)}
                >
                  <span className="wallet-row-icon" aria-hidden="true"><CircleDollarSign /></span>
                  <span className="wallet-row-copy">
                    <strong>{row.coins} moedas</strong>
                    <small>{formatWalletMoney(row.amount, currency)} · {row.method}</small>
                  </span>
                  <span className={`wallet-status ${status.modifier}`}>{status.label}</span>
                </button>
              )
            })}
          </div>
        ) : null}
        {pages > 1 ? (
          <Pagination page={page} pages={pages} busy={orders.isFetching} onChange={setPage} />
        ) : null}
      </Card>
      <Modal open={Boolean(selected)} title="Detalhe do pedido" onClose={() => setSelected(null)}>
        {selected ? (
          <dl className="ui-detail-list">
            {orderDetailEntries(selected).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : null}
      </Modal>
    </div>
  )
}
