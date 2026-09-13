import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function EnchantRevealModal({
  open,
  attempting,
  success,
  from,
  toward,
  level,
  onClose,
}: {
  open: boolean
  attempting: boolean
  success: boolean
  from: number
  toward: number
  level: number
  onClose: () => void
}) {
  const { t } = useTranslation('panel')
  const jackpot = success && !attempting && from >= 9 && level === 0
  const shownToward = jackpot ? 10 : toward
  const title = attempting
    ? t('games.economy.enchantAttempting')
    : success
      ? t('games.economy.enchantRevealWin')
      : t('games.economy.enchantRevealLoss')
  const outcome = attempting
    ? t('games.economy.enchantAttemptingHint', { from, toward: shownToward })
    : jackpot
      ? t('games.economy.enchantPeak', { goal: shownToward })
      : success
        ? t('games.economy.enchantRevealUp', { level })
        : t('games.economy.enchantRevealStay', { level: from })
  const tone = attempting ? 'is-attempting' : success ? 'is-win' : 'is-loss'
  return (
    <Modal
      className={`game-enchant-reveal-modal ${tone}`}
      open={open}
      title={title}
      onClose={attempting ? () => undefined : onClose}
    >
      <div className="enchant-reveal-field" aria-hidden="true">
        <i className="enchant-reveal-wash" />
        <i className="enchant-reveal-ring" />
        <i className="enchant-reveal-spark" />
      </div>
      <div className="enchant-reveal-stage">
        <span className="enchant-reveal-icon">
          <Sparkles aria-hidden="true" />
        </span>
        <strong className="enchant-reveal-level">
          <span className="is-from">+{from}</span>
          <span className="is-toward">+{shownToward}</span>
        </strong>
        <p className="enchant-reveal-outcome">{outcome}</p>
        {attempting ? null : (
          <div className="enchant-reveal-actions">
            <Button type="button" onClick={onClose}>{t('games.economy.enchantRevealContinue')}</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
