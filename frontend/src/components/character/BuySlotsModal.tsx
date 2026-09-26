import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertCircle, Coins, Sparkles, UsersRound, Wallet } from 'lucide-react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'

export interface BuySlotsModalProps {
  open: boolean
  unitPrice: number
  walletBalance: number
  currentSlots: { used: number; total: number }
  pending?: boolean
  isAvailable?: boolean
  onClose: () => void
  onConfirm: (quantity: number) => Promise<void>
}

const QUICK_QUANTITIES = [1, 2, 3, 5] as const

export function BuySlotsModal({
  open,
  unitPrice,
  walletBalance,
  currentSlots,
  pending = false,
  isAvailable = true,
  onClose,
  onConfirm,
}: BuySlotsModalProps) {
  const { t } = useTranslation('panel')
  const [quantity, setQuantity] = useState(1)

  const cleanQuantity = Math.max(1, Math.min(10, Math.floor(quantity) || 1))
  const totalPrice = cleanQuantity * unitPrice
  const hasBalance = walletBalance >= totalPrice
  const newLimit = currentSlots.total + cleanQuantity

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!hasBalance || pending || !isAvailable) return
    await onConfirm(cleanQuantity)
  }

  return (
    <Modal
      className="buy-slots-modal"
      open={open}
      title={t('accounts.buySlotsModal.title', { defaultValue: 'Comprar slots de conta' })}
      onClose={onClose}
    >
      <div className="buy-slots-content">
        <div className="buy-slots-hero">
          <div className="buy-slots-icon-wrap" aria-hidden="true">
            <Sparkles />
          </div>
          <p className="buy-slots-lead">
            {t('accounts.buySlotsModal.lead', {
              defaultValue: 'Adquira slots permanentes para vincular contas de jogo adicionais ao seu painel.',
            })}
          </p>
        </div>

        <div className="buy-slots-stats-grid">
          <div className="buy-slots-stat-card">
            <span className="stat-label">
              <UsersRound aria-hidden="true" />
              {t('accounts.buySlotsModal.currentSlots', { defaultValue: 'Slots atuais' })}
            </span>
            <strong className="stat-value">
              {currentSlots.used} / {currentSlots.total}
            </strong>
          </div>
          <div className="buy-slots-stat-card">
            <span className="stat-label">
              <Wallet aria-hidden="true" />
              {t('accounts.buySlotsModal.walletBalance', { defaultValue: 'Saldo na carteira' })}
            </span>
            <strong className="stat-value">
              {walletBalance.toFixed(2)} {t('accounts.buySlotsModal.coinsUnit', { defaultValue: 'moedas' })}
            </strong>
          </div>
        </div>

        {!isAvailable ? (
          <div className="buy-slots-notice is-warning">
            <AlertCircle aria-hidden="true" />
            <span>
              {t('accounts.buySlotsModal.serviceUnavailable', {
                defaultValue: 'A compra de slots está temporariamente desativada pelo servidor.',
              })}
            </span>
          </div>
        ) : (
          <form className="buy-slots-form" onSubmit={handleSubmit}>
            <div className="buy-slots-quantity-section">
              <label className="buy-slots-label">
                {t('accounts.buySlotsModal.quantityLabel', { defaultValue: 'Quantidade de slots' })}
              </label>
              <div className="buy-slots-pills">
                {QUICK_QUANTITIES.map((qty) => (
                  <Button
                    key={qty}
                    type="button"
                    size="sm"
                    variant={cleanQuantity === qty ? 'primary' : 'secondary'}
                    disabled={pending}
                    onClick={() => setQuantity(qty)}
                  >
                    +{qty} {qty === 1 ? 'slot' : 'slots'}
                  </Button>
                ))}
              </div>
              <Field
                className="buy-slots-number-field"
                hint={t('accounts.buySlotsModal.quantityHint', {
                  defaultValue: 'Selecione entre 1 e 10 slots adicionais.',
                })}
              >
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={quantity}
                  disabled={pending}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="buy-slots-summary-card">
              <div className="summary-row">
                <span>{t('accounts.buySlotsModal.pricePerSlot', { defaultValue: 'Preço por slot' })}:</span>
                <strong>
                  {unitPrice.toFixed(2)} {t('accounts.buySlotsModal.coinsUnit', { defaultValue: 'moedas' })}
                </strong>
              </div>
              <div className="summary-row">
                <span>{t('accounts.buySlotsModal.newLimit', { limit: newLimit, defaultValue: `Novo limite total: ${newLimit} contas` })}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row total-row">
                <span>{t('accounts.buySlotsModal.totalLabel', { defaultValue: 'Total a pagar' })}:</span>
                <span className="total-highlight">
                  <Coins aria-hidden="true" />
                  <strong>{totalPrice.toFixed(2)}</strong> {t('accounts.buySlotsModal.coinsUnit', { defaultValue: 'moedas' })}
                </span>
              </div>
            </div>

            {!hasBalance ? (
              <div className="buy-slots-notice is-danger">
                <AlertCircle aria-hidden="true" />
                <div className="notice-body">
                  <span>
                    {t('accounts.buySlotsModal.insufficientBalance', {
                      defaultValue: 'Saldo insuficiente na carteira para esta quantidade.',
                    })}
                  </span>
                  <Link to="/panel/wallet" className="recharge-link">
                    {t('accounts.buySlotsModal.rechargeWallet', { defaultValue: 'Recarregar carteira' })} →
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="buy-slots-actions">
              <Button
                type="submit"
                variant="primary"
                disabled={pending || !hasBalance || cleanQuantity < 1}
              >
                <Coins aria-hidden="true" />
                {pending
                  ? t('common.loading', { defaultValue: 'Processando...' })
                  : t('accounts.buySlotsModal.confirmBtnPrice', {
                      quantity: cleanQuantity,
                      price: totalPrice.toFixed(2),
                      defaultValue: `Comprar ${cleanQuantity} slot(s) por ${totalPrice.toFixed(2)} moedas`,
                    })}
              </Button>
              <Button variant="ghost" type="button" disabled={pending} onClick={onClose}>
                {t('accounts.buySlotsModal.cancelBtn', { defaultValue: 'Cancelar' })}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
