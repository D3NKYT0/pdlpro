import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Coins, Send, ShieldCheck, UserRound } from 'lucide-react'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'

type WalletTransferCardProps = {
  recipient: string
  amount: string
  busy: boolean
  onRecipientChange: (value: string) => void
  onAmountChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function WalletTransferCard({
  recipient,
  amount,
  busy,
  onRecipientChange,
  onAmountChange,
  onSubmit,
}: WalletTransferCardProps) {
  const { t } = useTranslation('panel')

  return (
    <Card className="wallet-transfer-card">
      <header className="wallet-compact-heading">
        <span className="wallet-section-icon" aria-hidden="true"><Send /></span>
        <div>
          <span className="panel-eyebrow">{t('wallet.transfer.eyebrow')}</span>
          <h2>{t('wallet.transfer.title')}</h2>
        </div>
      </header>
      <p className="muted">{t('wallet.transfer.description')}</p>
      <form className="wallet-transfer-form" onSubmit={onSubmit}>
        <Field>
          <span className="wallet-field-label"><UserRound aria-hidden="true" /> {t('wallet.transfer.recipient')}</span>
          <input
            value={recipient}
            onChange={(event) => onRecipientChange(event.target.value)}
            placeholder={t('wallet.transfer.recipientPlaceholder')}
            autoComplete="off"
            required
          />
        </Field>
        <Field>
          <span className="wallet-field-label"><Coins aria-hidden="true" /> {t('wallet.transfer.amount')}</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.00"
            required
          />
        </Field>
        <Button type="submit" disabled={busy || !recipient || !amount}>
          <Send aria-hidden="true" /> {busy ? t('wallet.transfer.submitting') : t('wallet.transfer.submit')}
        </Button>
        <small className="wallet-transfer-warning"><ShieldCheck aria-hidden="true" /> {t('wallet.transfer.warning')}</small>
      </form>
    </Card>
  )
}
