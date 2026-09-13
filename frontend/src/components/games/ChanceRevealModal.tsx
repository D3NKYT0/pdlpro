import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DICE_PIP_FACES } from './gameArt'
import { SlotMark } from './slotSymbols'

export function ChanceRevealModal({
  open,
  kind,
  won,
  roll,
  reels = [],
  payout = 0,
  onClose,
}: {
  open: boolean
  kind?: 'dice' | 'slots'
  won: boolean
  roll?: number
  reels?: string[]
  payout?: number
  onClose: () => void
}) {
  const { t } = useTranslation('panel')
  if (!kind) return null
  const face = roll && roll >= 1 && roll <= 6 ? roll : 1
  const pips = DICE_PIP_FACES[face]
  const title = won ? t('games.chance.revealWin') : t('games.chance.revealLoss')
  const outcome = won
    ? t('games.chance.revealPayout', { payout })
    : t('games.chance.revealNothing')
  return (
    <Modal
      className={`game-chance-reveal-modal ${won ? 'is-win' : 'is-loss'}`}
      open={open}
      title={title}
      onClose={onClose}
    >
      <div className="game-chance-reveal-field" aria-hidden="true">
        <i className="game-chance-reveal-wash" />
        <i className="game-chance-reveal-ring" />
      </div>
      <div className="game-chance-reveal-stage">
        {kind === 'dice' ? (
          <strong className="game-chance-reveal-face" data-face={roll}>
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} data-pip={index + 1} className={pips.includes(index + 1) ? 'is-on' : undefined} />
            ))}
          </strong>
        ) : (
          <div className="game-chance-reveal-reels">
            {reels.map((symbol, index) => (
              <span className="game-chance-reveal-reel" data-symbol={symbol} key={`${symbol}-${index}`}>
                <SlotMark symbol={symbol} />
                <em>{t(`games.chance.symbols.${symbol}`, { defaultValue: symbol })}</em>
              </span>
            ))}
          </div>
        )}
        <strong className="game-chance-reveal-outcome">{outcome}</strong>
        <div className="game-chance-reveal-actions">
          <Button type="button" onClick={onClose}>{t('games.chance.revealContinue')}</Button>
        </div>
      </div>
    </Modal>
  )
}
