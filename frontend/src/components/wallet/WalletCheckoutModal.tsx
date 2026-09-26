import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Info,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { formatDocument, inferDocumentType, sanitizeDocument } from '../../lib/payments'
import { formatWalletMoney } from './walletHistory'
import type { ApiCoinPackage, ApiPaymentOrder } from '../../services/types'

export interface WalletCheckoutModalProps {
  open: boolean
  order: ApiPaymentOrder | null
  onClose: () => void
  document: string
  onDocumentChange: (value: string) => void
  busy: boolean
  onPayStripe: (event: FormEvent) => void
  simulatedPayment: boolean
  packages: ApiCoinPackage[]
  isBrickReady?: boolean
}

export function WalletCheckoutModal({
  open,
  order,
  onClose,
  document,
  onDocumentChange,
  busy,
  onPayStripe,
  simulatedPayment,
  packages,
  isBrickReady = false,
}: WalletCheckoutModalProps) {
  const { t } = useTranslation('panel')
  const [copied, setCopied] = useState(false)

  if (!order) return null

  const sanitized = sanitizeDocument(document)
  const docType = inferDocumentType(sanitized)
  const isValidDoc = Boolean(docType)
  const currency = (order.currency as 'BRL' | 'USD') || 'BRL'

  const pack = packages.find(
    (item) => item.id === order.package_code || item.name === order.package_code,
  )
  const packName = pack?.name || (order.package_code ? order.package_code : t('wallet.detail.packageCustom'))
  const bonus = Number(order.bonus_applied || pack?.bonus || 0)
  const totalCoins = order.coins || pack?.total_coins || '—'

  const isPix = Boolean(order.pix_qr_code)
  const title = isPix
    ? t('wallet.purchase.pixTitle')
    : t('wallet.purchase.checkoutTitle')

  async function handleCopyPix() {
    if (!order?.pix_qr_code) return
    try {
      await navigator.clipboard.writeText(order.pix_qr_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose} className="wallet-checkout-modal">
      <div className="wallet-checkout-summary">
        <div className="wallet-checkout-summary-main">
          <span className="wallet-checkout-summary-eyebrow">
            {pack?.badge ? (
              <span className="wallet-checkout-badge">
                <Sparkles aria-hidden="true" /> {pack.badge}
              </span>
            ) : (
              t('wallet.purchase.checkoutSummary')
            )}
          </span>
          <div className="wallet-checkout-summary-coins">
            <Coins aria-hidden="true" />
            <span>{totalCoins} {t('wallet.purchase.packCoins')}</span>
            {bonus > 0 ? (
              <span className="wallet-checkout-summary-bonus">
                {t('wallet.purchase.packBonus', { bonus })}
              </span>
            ) : null}
          </div>
          <small className="wallet-checkout-summary-name">{packName}</small>
        </div>

        <div className="wallet-checkout-summary-price">
          <span className="wallet-checkout-summary-price-label">{t('wallet.purchase.checkoutTotal')}</span>
          <strong className="wallet-checkout-summary-price-val">
            {formatWalletMoney(order.amount, currency)}
          </strong>
        </div>
      </div>

      {isPix ? (
        <div className="wallet-pix-card">
          <span className="wallet-pix-badge">
            <span className="wallet-pix-pulse" />
            {t('wallet.purchase.pixWaiting')}
          </span>

          {order.pix_qr_code_base64 ? (
            <div className="wallet-pix-qr-wrapper">
              <img
                src={`data:image/png;base64,${order.pix_qr_code_base64}`}
                alt={t('wallet.purchase.pixAlt')}
                width={200}
                height={200}
              />
            </div>
          ) : (
            <div className="wallet-pix-icon-fallback">
              <QrCode aria-hidden="true" />
            </div>
          )}

          <p className="wallet-pix-instructions">{t('wallet.purchase.pixInstructions')}</p>

          <div className="wallet-pix-copy-box">
            <div className="wallet-pix-code-field">
              <textarea readOnly value={order.pix_qr_code} rows={2} aria-label={t('wallet.purchase.pixTitle')} />
            </div>
            <div className="wallet-pix-actions">
              <Button type="button" onClick={handleCopyPix}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? t('wallet.purchase.pixCopied') : t('wallet.purchase.pixCopy')}
              </Button>
            </div>
          </div>

          <small className="wallet-pix-autocredit">{t('wallet.purchase.pixAutoCredit')}</small>
        </div>
      ) : null}

      {!isPix && order.method === 'mercadopago' ? (
        <div className="wallet-mp-container">
          <div className="wallet-document-section">
            <div className="wallet-document-header">
              <label htmlFor="wallet-payer-doc" className="wallet-document-title">
                <ShieldCheck aria-hidden="true" />
                {t('wallet.purchase.document')}
              </label>
              {isValidDoc ? (
                <span className="wallet-document-badge is-valid">
                  <CheckCircle2 aria-hidden="true" />
                  {t('wallet.purchase.documentValid', { type: docType })}
                </span>
              ) : (
                <span className="wallet-document-badge is-waiting">
                  <AlertCircle aria-hidden="true" />
                  {t('wallet.purchase.documentHint')}
                </span>
              )}
            </div>

            <Field className="wallet-document-field">
              <input
                id="wallet-payer-doc"
                type="text"
                inputMode="numeric"
                value={document}
                onChange={(e) => onDocumentChange(formatDocument(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={18}
                autoComplete="off"
              />
            </Field>

            {!isValidDoc ? (
              <p className="wallet-document-prompt">{t('wallet.purchase.documentRequired')}</p>
            ) : null}
          </div>

          {isValidDoc ? (
            <div className="wallet-brick-wrapper">
              {!isBrickReady ? (
                <div className="wallet-brick-loading">
                  <Loader2 className="is-spinning" aria-hidden="true" />
                  <span>{t('wallet.purchase.loadingBrick')}</span>
                </div>
              ) : null}
              <div id="payment-brick" style={{ display: isBrickReady ? 'block' : 'none' }} />
            </div>
          ) : null}
        </div>
      ) : null}

      {!isPix && order.method === 'stripe' ? (
        <form className="wallet-stripe-form" onSubmit={(event) => void onPayStripe(event)}>
          <div id="stripe-element" />
          <Button type="submit" disabled={busy}>
            <CreditCard aria-hidden="true" /> {t('wallet.purchase.payCard')}
          </Button>
        </form>
      ) : null}

      {!isPix && (order.method === 'mock' || simulatedPayment) ? (
        <div className="wallet-mock-card">
          <Info aria-hidden="true" />
          <div>
            <strong>{t('wallet.purchase.mockTitle')}</strong>
            <p>{t('wallet.purchase.mockNotice')}</p>
          </div>
        </div>
      ) : null}

      <footer className="wallet-checkout-footer">
        <span className="wallet-checkout-secure">
          <ShieldCheck aria-hidden="true" />
          {t('wallet.purchase.checkoutSecure')}
        </span>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('wallet.purchase.checkoutCancel')}
        </Button>
      </footer>
    </Modal>
  )
}
