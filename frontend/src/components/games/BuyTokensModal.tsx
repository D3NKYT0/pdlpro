import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Coins, Sparkles } from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'

const TOKEN_PACKS = [5, 10, 25, 50, 100] as const

export function BuyTokensModal({
  open,
  tokens,
  amount,
  pending = false,
  onAmountChange,
  onClose,
  onConfirm,
}: {
  open: boolean
  tokens: number
  amount: string
  pending?: boolean
  onAmountChange: (value: string) => void
  onClose: () => void
  onConfirm: (event: FormEvent) => void
}) {
  const { t } = useTranslation('panel')
  const quantity = Math.max(0, Number(amount) || 0)
  const selected = TOKEN_PACKS.find((pack) => pack === quantity)
  const price = formatCurrency(quantity)
  return (
    <Modal className="game-tokens-buy-modal" open={open} title={t('games.tokensBuy.title')} onClose={onClose}>
      <div className="game-tokens-buy-field" aria-hidden="true">
        <i className="game-tokens-buy-wash" />
        <i className="game-tokens-buy-spark" />
        <i className="game-tokens-buy-spark is-late" />
      </div>
      <div className="game-tokens-buy-stage">
        <div className="game-tokens-buy-hero">
          <span className="game-tokens-buy-medallion" aria-hidden="true">
            <i />
            <i />
            <Coins />
          </span>
          <p>{t('games.tokensBuy.lead')}</p>
          <div className="game-tokens-buy-vault">
            <Sparkles aria-hidden="true" />
            <span>
              <small>{t('games.tokensBuy.vault')}</small>
              <strong>{t('games.tokens', { count: tokens })}</strong>
            </span>
          </div>
        </div>
        <form className="game-tokens-buy-form" onSubmit={onConfirm}>
          <p className="game-tokens-buy-packs-label">{t('games.tokensBuy.packs')}</p>
          <div className="game-tokens-buy-packs">
            {TOKEN_PACKS.map((pack) => (
              <Button
                key={pack}
                type="button"
                size="sm"
                variant={selected === pack ? 'yellow' : 'secondary'}
                aria-pressed={selected === pack}
                disabled={pending}
                onClick={() => onAmountChange(String(pack))}
              >
                {t('games.tokensBuy.pack', { count: pack })}
              </Button>
            ))}
          </div>
          <Field className="game-tokens-buy-amount" label={t('games.tokensBuy.amount')} hint={t('games.roulette.buyHint')}>
            <input value={amount} onChange={(event) => onAmountChange(event.target.value)} inputMode="numeric" />
          </Field>
          <div className="game-tokens-buy-checkout">
            <div className="game-tokens-buy-total">
              <span>{t('games.tokensBuy.youGet', { count: quantity || 0 })}</span>
              <strong>{price}</strong>
            </div>
            <div className="game-box-reset-actions">
              <Button type="submit" variant="yellow" disabled={pending || quantity < 1}>
                <Coins aria-hidden="true" /> {t('games.tokensBuy.confirm', { price })}
              </Button>
              <Button variant="ghost" type="button" disabled={pending} onClick={onClose}>
                {t('games.tokensBuy.cancel')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}
