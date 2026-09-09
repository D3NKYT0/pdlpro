import { useTranslation } from 'react-i18next'
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Clock3, History, ReceiptText } from 'lucide-react'
import { Card } from '../ui/Card'
import { ButtonLink } from '../ui/Button'
import type { ApiPaymentOrder, ApiWalletTransaction } from '../../services/types'
import {
  formatWalletMoney,
  getOrderStatus,
  getTransactionPresentation,
} from './walletHistory'

type WalletActivityCardProps = {
  ordersCount: number
  txCount: number
  ordersLoading: boolean
  txLoading: boolean
  paymentOrders: ApiPaymentOrder[]
  transactions: ApiWalletTransaction[]
  onSelectOrder: (order: ApiPaymentOrder) => void
  onSelectTx: (tx: ApiWalletTransaction) => void
}

export function WalletActivityCard({
  ordersCount,
  txCount,
  ordersLoading,
  txLoading,
  paymentOrders,
  transactions,
  onSelectOrder,
  onSelectTx,
}: WalletActivityCardProps) {
  const { t } = useTranslation('panel')

  return (
    <Card className="wallet-activity-card">
      <div className="wallet-activity-section">
        <header className="wallet-activity-heading">
          <span className="wallet-section-icon" aria-hidden="true"><ReceiptText /></span>
          <div><span className="panel-eyebrow">{t('wallet.activity.ordersEyebrow')}</span><h2>{t('wallet.activity.ordersTitle')}</h2></div>
          <b>{ordersCount}</b>
        </header>
        {ordersLoading ? (
          <div className="wallet-empty-state"><Clock3 aria-hidden="true" /><span>{t('wallet.activity.ordersLoading')}</span></div>
        ) : paymentOrders.length ? (
          <div className="wallet-activity-list">
            {paymentOrders.map((row) => {
              const status = getOrderStatus(row.status, t)
              const orderCurrency = row.currency === 'USD' ? 'USD' : 'BRL'
              return (
                <button
                  type="button"
                  className="wallet-activity-item"
                  key={row.id}
                  onClick={() => onSelectOrder(row)}
                >
                  <span className="wallet-row-icon" aria-hidden="true"><CircleDollarSign /></span>
                  <span className="wallet-row-copy">
                    <strong>{t('wallet.activity.coins', { coins: row.coins })}</strong>
                    <small>{formatWalletMoney(row.amount, orderCurrency)} · {row.method}</small>
                  </span>
                  <span className={`wallet-status ${status.modifier}`}>{status.label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="wallet-empty-state"><ReceiptText aria-hidden="true" /><span><strong>{t('wallet.activity.ordersEmptyTitle')}</strong><small>{t('wallet.activity.ordersEmptyText')}</small></span></div>
        )}
        <ButtonLink to="/painel/wallet/pedidos" variant="ghost" size="sm" className="wallet-history-link">{t('wallet.activity.ordersLink')}</ButtonLink>
      </div>

      <div className="wallet-activity-section">
        <header className="wallet-activity-heading">
          <span className="wallet-section-icon" aria-hidden="true"><History /></span>
          <div><span className="panel-eyebrow">{t('wallet.activity.transactionsEyebrow')}</span><h2>{t('wallet.activity.transactionsTitle')}</h2></div>
          <b>{txCount}</b>
        </header>
        {txLoading ? (
          <div className="wallet-empty-state"><Clock3 aria-hidden="true" /><span>{t('wallet.activity.transactionsLoading')}</span></div>
        ) : transactions.length ? (
          <div className="wallet-activity-list">
            {transactions.map((row) => {
              const presentation = getTransactionPresentation(row.kind, row.amount, t)
              const DirectionIcon = presentation.outgoing ? ArrowUpRight : ArrowDownLeft
              return (
                <button
                  type="button"
                  className="wallet-activity-item"
                  key={row.id}
                  onClick={() => onSelectTx(row)}
                >
                  <span className={`wallet-row-icon ${presentation.outgoing ? 'is-outgoing' : 'is-incoming'}`} aria-hidden="true"><DirectionIcon /></span>
                  <span className="wallet-row-copy">
                    <strong>{row.description || row.kind}</strong>
                    <small>{row.kind}</small>
                  </span>
                  <span className={`wallet-transaction-value ${presentation.outgoing ? 'is-outgoing' : 'is-incoming'}`}>{presentation.amount}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="wallet-empty-state"><History aria-hidden="true" /><span><strong>{t('wallet.activity.transactionsEmptyTitle')}</strong><small>{t('wallet.activity.transactionsEmptyText')}</small></span></div>
        )}
        <ButtonLink to="/painel/wallet/extrato" variant="ghost" size="sm" className="wallet-history-link">{t('wallet.activity.transactionsLink')}</ButtonLink>
      </div>
    </Card>
  )
}
