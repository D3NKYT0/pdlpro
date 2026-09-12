import { useTranslation } from 'react-i18next'
import { formatCompactQuantity } from '../../lib/formatters'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { BoxChest } from './GameVisuals'

export function BoxRevealModal({
  open,
  name,
  opening = false,
  prizeName,
  prizeItemId,
  prizeQuantity,
  prizeEnchant,
  hunt = false,
  onClose,
}: {
  open: boolean
  name: string
  opening?: boolean
  prizeName?: string | null
  prizeItemId?: number
  prizeQuantity?: number
  prizeEnchant?: number
  hunt?: boolean
  onClose: () => void
}) {
  const { t } = useTranslation('panel')
  const won = Boolean(prizeName) && !opening
  const prizeCaption = prizeName
    ? [
        prizeEnchant ? t('games.boxes.prizeEnchant', { enchant: prizeEnchant }) : null,
        t('games.roulette.prizeQty', { quantity: formatCompactQuantity(prizeQuantity ?? 1) }),
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined
  return (
    <Modal
      className={`game-box-reveal-modal${opening ? ' is-opening' : ''}${won ? ' is-win' : ''}`}
      open={open}
      title={won ? t(hunt ? 'games.boxes.revealHunt' : 'games.boxes.revealFound') : t('games.boxes.revealTitle')}
      onClose={won ? onClose : () => undefined}
    >
      <BoxChest
        variant="hero"
        name={name}
        opening={opening}
        prizeName={prizeName}
        prizeItemId={prizeItemId}
        prizeCaption={prizeCaption}
      />
      {won ? (
        <Button type="button" onClick={onClose}>
          {t('games.boxes.continue')}
        </Button>
      ) : null}
    </Modal>
  )
}
