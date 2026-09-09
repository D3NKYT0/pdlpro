import { Card } from '../components/ui/Card'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState, LoadingState } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, History } from 'lucide-react'
import { walletApi } from '../services/api'
import type { ApiWalletTransaction } from '../services/types'
import { getTransactionPresentation, transactionDetailEntries } from './walletHistory'

export function WalletTransactionsPage() {
  const { t } = useTranslation('panel')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ApiWalletTransaction | null>(null)
  const tx = useQuery({
    queryKey: ['wallet-tx', page],
    queryFn: () => walletApi.transactions({ page, page_size: 20 }),
  })
  const results = tx.data?.results ?? []
  const pages = Math.max(1, tx.data?.total_pages ?? 1)

  return (
    <div className="wallet-page wallet-history-page">
      <div className="program-actions">
        <ButtonLink to="/painel/wallet" variant="ghost" size="sm">
          <ArrowLeft aria-hidden="true" /> {t('wallet.history.back')}
        </ButtonLink>
      </div>
      <Card className="wallet-history-card">
        <header className="wallet-activity-heading">
          <span className="wallet-section-icon" aria-hidden="true"><History /></span>
          <div>
            <span className="panel-eyebrow">{t('wallet.activity.transactionsEyebrow')}</span>
            <h1>{t('wallet.activity.transactionsTitle')}</h1>
          </div>
          <b>{tx.data?.count ?? 0}</b>
        </header>
        {tx.isLoading ? <LoadingState /> : null}
        {!tx.isLoading && !results.length ? (
          <EmptyState>{t('wallet.history.transactionsEmpty')}</EmptyState>
        ) : null}
        {results.length ? (
          <div className="wallet-activity-list is-expanded">
            {results.map((row) => {
              const presentation = getTransactionPresentation(row.kind, row.amount, t)
              const DirectionIcon = presentation.outgoing ? ArrowUpRight : ArrowDownLeft
              return (
                <button
                  type="button"
                  className="wallet-activity-item"
                  key={row.id}
                  onClick={() => setSelected(row)}
                >
                  <span className={`wallet-row-icon ${presentation.outgoing ? 'is-outgoing' : 'is-incoming'}`} aria-hidden="true">
                    <DirectionIcon />
                  </span>
                  <span className="wallet-row-copy">
                    <strong>{row.description || row.kind}</strong>
                    <small>{row.kind}</small>
                  </span>
                  <span className={`wallet-transaction-value ${presentation.outgoing ? 'is-outgoing' : 'is-incoming'}`}>
                    {presentation.amount}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
        {pages > 1 ? (
          <Pagination page={page} pages={pages} busy={tx.isFetching} onChange={setPage} />
        ) : null}
      </Card>
      <Modal open={Boolean(selected)} title={t('wallet.modal.transaction')} onClose={() => setSelected(null)}>
        {selected ? (
          <dl className="ui-detail-list">
            {transactionDetailEntries(selected, t).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : null}
      </Modal>
    </div>
  )
}
