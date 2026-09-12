import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatCurrency, formatNumber } from '../../lib/formatters'
import type { PaymentReportRow } from '../../services/api'

type MockPaymentConfirmModalProps = {
  order: PaymentReportRow | null
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function MockPaymentConfirmModal({ order, pending, onClose, onConfirm }: MockPaymentConfirmModalProps) {
  const { t } = useTranslation('admin')
  if (!order) return null
  const coins = formatNumber(order.coins, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <Modal
      open
      className="finance-mock-confirm"
      title={t('reports.finance.mockConfirm.title')}
      onClose={pending ? () => undefined : onClose}
    >
      <p className="finance-mock-alert" role="alert">
        <span className="finance-mock-blink">{t('reports.finance.mockConfirm.attention')}</span>
      </p>
      <p className="finance-mock-lead">{t('reports.finance.mockConfirm.lead')}</p>
      <p className="finance-mock-body">
        {t('reports.finance.mockConfirm.body', {
          id: order.id,
          username: order.username,
          coins,
          amount: formatCurrency(order.amount, order.currency),
          currency: order.currency,
        })}
      </p>
      <div className="finance-mock-actions">
        <Button variant="danger" onClick={() => void onConfirm()} busy={pending} busyLabel={t('reports.finance.mockConfirm.busy')}>
          {t('reports.finance.mockConfirm.confirm')}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          {t('reports.finance.mockConfirm.cancel')}
        </Button>
      </div>
    </Modal>
  )
}
