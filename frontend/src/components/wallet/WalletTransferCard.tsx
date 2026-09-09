import type { FormEvent } from 'react'
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
  return (
    <Card className="wallet-transfer-card">
      <header className="wallet-compact-heading">
        <span className="wallet-section-icon" aria-hidden="true"><Send /></span>
        <div>
          <span className="panel-eyebrow">Entre jogadores</span>
          <h2>Transferir moedas</h2>
        </div>
      </header>
      <p className="muted">Envie moedas diretamente para outro jogador usando o nome da conta.</p>
      <form className="wallet-transfer-form" onSubmit={onSubmit}>
        <Field>
          <span className="wallet-field-label"><UserRound aria-hidden="true" /> Destinatário</span>
          <input
            value={recipient}
            onChange={(event) => onRecipientChange(event.target.value)}
            placeholder="Nome do jogador"
            autoComplete="off"
            required
          />
        </Field>
        <Field>
          <span className="wallet-field-label"><Coins aria-hidden="true" /> Quantidade</span>
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
          <Send aria-hidden="true" /> {busy ? 'Enviando...' : 'Transferir moedas'}
        </Button>
        <small className="wallet-transfer-warning"><ShieldCheck aria-hidden="true" /> Confira o destinatário antes de confirmar.</small>
      </form>
    </Card>
  )
}
