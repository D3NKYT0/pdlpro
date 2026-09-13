import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { ItemIcon } from '../ItemIcon'
import { formatCompactQuantity } from '../../lib/formatters'
import { inferBoxRarity } from './gameArt'
import { BoxChest } from './GameVisuals'

export type BoxHuntItem = {
  name: string
  item_id: number
  enchant?: number
  quantity?: number
  rarity?: string
}

export function BoxHuntCard({
  name,
  price,
  opens,
  featured,
  items = [],
  owned = false,
  remaining,
  total,
  opening = false,
  resetting = false,
  huntRemaining,
  locked = false,
  onAction,
  actionLabel,
}: {
  name: string
  price?: string
  opens?: number
  featured?: BoxHuntItem | null
  items?: BoxHuntItem[]
  owned?: boolean
  remaining?: number
  total?: number
  opening?: boolean
  resetting?: boolean
  huntRemaining?: boolean
  locked?: boolean
  onAction: () => void
  actionLabel: string
}) {
  const { t } = useTranslation('panel')
  const extras = items.filter((item) => item.item_id !== featured?.item_id || item.quantity !== featured?.quantity)
  const rarity = inferBoxRarity(name, price)
  return (
    <article
      className={`game-box-card${owned ? ' is-owned' : ''}${owned && huntRemaining === false ? ' is-claimed' : ''}${opening ? ' is-opening' : ''}`}
      data-rarity={rarity}
    >
      <BoxChest name={name} price={price} opening={opening} claimed={owned && huntRemaining === false} />
      <header className="game-box-copy">
        <strong>{name}</strong>
        <small>
          {owned
            ? t('games.boxes.remaining', { remaining: remaining ?? 0, total: total ?? 0 })
            : t('games.boxes.opens', { count: opens ?? 0 })}
        </small>
      </header>
      {featured ? (
        <div className="game-box-hunt">
          <span>
            {owned ? t(huntRemaining ? 'games.boxes.huntWaiting' : 'games.boxes.huntTaken') : t('games.boxes.guarantee')}
          </span>
          <div>
            <ItemIcon itemId={featured.item_id} name={featured.name} size={40} />
            <b>{featured.name}</b>
            <small>{t('games.roulette.prizeQty', { quantity: formatCompactQuantity(featured.quantity ?? 1) })}</small>
          </div>
        </div>
      ) : null}
      {extras.length ? (
        <div className="game-box-also">
          <span>{t('games.boxes.also')}</span>
          <ul>
            {extras.map((item) => (
              <li key={`${item.item_id}-${item.quantity ?? 1}`} title={item.name}>
                <ItemIcon itemId={item.item_id} name={item.name} size={24} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {owned ? null : <b className="game-box-price">{t('games.boxes.price', { price })}</b>}
      <footer className="game-box-actions">
        <small className="game-box-hint">
          {locked ? t('games.boxes.resetLockedHint') : resetting ? t('games.boxes.resetHint') : t('games.boxes.openHint')}
        </small>
        <Button
          variant={owned ? 'success' : resetting ? 'warning' : 'ghost'}
          type="button"
          disabled={locked}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </footer>
    </article>
  )
}
