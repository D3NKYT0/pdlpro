import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCompactQuantity } from '../../lib/formatters'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { BoxChest } from './GameVisuals'

const HUNT_PARTICLES = 22
const HUNT_ORBS = 6

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
      className={`game-box-reveal-modal${opening ? ' is-opening' : ''}${won ? ' is-win' : ''}${hunt && won ? ' is-hunt' : ''}`}
      open={open}
      title={won ? t(hunt ? 'games.boxes.revealHunt' : 'games.boxes.revealFound') : t('games.boxes.revealTitle')}
      onClose={won ? onClose : () => undefined}
    >
      {hunt && won ? (
        <div className="game-box-hunt-field" aria-hidden="true">
          <i className="game-box-hunt-wash" />
          <i className="game-box-hunt-veil" />
          <i className="game-box-hunt-ribbon" />
          <i className="game-box-hunt-ribbon is-late" />
          {Array.from({ length: HUNT_ORBS }, (_, index) => (
            <i
              key={`orb-${index}`}
              className="game-box-hunt-orb"
              style={{ '--p': index, '--d': `${index * 380}ms` } as CSSProperties}
            />
          ))}
          {Array.from({ length: HUNT_PARTICLES }, (_, index) => (
            <i
              key={index}
              className="game-box-hunt-particle"
              style={
                {
                  '--x': `${6 + ((index * 17) % 88)}%`,
                  '--s': `${0.55 + (index % 5) * 0.18}`,
                  '--d': `${(index % 11) * 160}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
      <BoxChest
        variant="hero"
        name={name}
        opening={opening}
        prizeName={prizeName}
        prizeItemId={prizeItemId}
        prizeCaption={prizeCaption}
        hunt={hunt}
      />
      {won ? (
        <Button type="button" onClick={onClose}>
          {t('games.boxes.continue')}
        </Button>
      ) : null}
    </Modal>
  )
}
