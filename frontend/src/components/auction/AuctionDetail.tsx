import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Clock3,
  Eye,
  Gavel,
  X,
} from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatCurrency, formatDateTime as formatDate } from '../../lib/formatters'
import type { ApiAuction } from '../../services/api'
import { auctionStatusFor, formatRemaining, nextBidFor } from './auctionHelpers'

interface AuctionDetailProps {
  auction: ApiAuction
  isOwner: boolean
  bidAmount: string
  bidCharacter: string
  characters: Array<{ char_id: number; name: string; level: number }>
  pending: boolean
  onAmountChange: (value: string) => void
  onCharacterChange: (value: string) => void
  onClose: () => void
  onBid: (event: FormEvent, auctionId: string) => void
}

export function AuctionDetail({
  auction,
  isOwner,
  bidAmount,
  bidCharacter,
  characters,
  pending,
  onAmountChange,
  onCharacterChange,
  onClose,
  onBid,
}: AuctionDetailProps) {
  const { t } = useTranslation('panel')
  const status = auctionStatusFor(auction.status, t)
  const activeValue = auction.current_bid ?? auction.min_bid

  return (
    <article className="marketplace-listing-detail auction-detail" aria-label={t('auctions.detail.aria', { name: auction.item_name })}>
      <div className="marketplace-listing-detail-hero">
        <div className="marketplace-detail-identity auction-detail-identity">
          <div className="auction-item-icon large">
            <ItemIcon itemId={auction.item_id} name={auction.item_name} size={64} />
          </div>
          <div>
            <span className="panel-eyebrow">{t('auctions.detail.eyebrow')}</span>
            <h2>{auction.item_name}</h2>
            <p>
              {t('auctions.detail.quantityLine', { quantity: auction.quantity.toLocaleString('pt-BR') })}
              {auction.item_enchant > 0
                ? t('auctions.detail.enchantSuffix', { enchant: auction.item_enchant })
                : t('auctions.detail.noEnchantSuffix')}
            </p>
          </div>
        </div>
        <div className="marketplace-detail-top-actions">
          {isOwner ? <span className="marketplace-owner-badge"><Eye aria-hidden="true" /> {t('auctions.detail.ownerBadge')}</span> : null}
          <span className={`marketplace-status ${status.className}`}>{status.label}</span>
          <button className="marketplace-detail-close" type="button" onClick={onClose} aria-label={t('auctions.detail.close')}>
            <X aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="auction-detail-grid">
        <div className="auction-item-information">
          <dl className="marketplace-character-stats auction-item-stats">
            <div><dt>{t('auctions.detail.itemId')}</dt><dd>{auction.item_id}</dd></div>
            <div><dt>{t('auctions.detail.quantity')}</dt><dd>{auction.quantity.toLocaleString('pt-BR')}</dd></div>
            <div><dt>{t('auctions.detail.enchant')}</dt><dd>{auction.item_enchant > 0 ? `+${auction.item_enchant}` : t('auctions.detail.noEnchant')}</dd></div>
            <div><dt>{t('auctions.detail.seller')}</dt><dd>{auction.seller_username}</dd></div>
            <div><dt>{t('auctions.detail.sourceInventory')}</dt><dd>{auction.character_name || t('auctions.detail.notInformed')}</dd></div>
            <div><dt>{t('auctions.detail.highestBid')}</dt><dd>{auction.highest_bidder_username || t('auctions.detail.noBids')}</dd></div>
          </dl>
          <div className="auction-ending-card">
            <Clock3 aria-hidden="true" />
            <div>
              <span className="panel-eyebrow">{t('auctions.detail.endingEyebrow')}</span>
              <strong>{formatDate(auction.ends_at)}</strong>
              <small>{formatRemaining(auction.ends_at, t)}</small>
            </div>
          </div>
        </div>

        <aside className="marketplace-purchase-summary auction-bid-summary">
          <span>{auction.current_bid ? t('auctions.detail.currentBid') : t('auctions.detail.startingValue')}</span>
          <strong>{formatCurrency(activeValue)}</strong>
          <small>{t('auctions.detail.minBid', { value: formatCurrency(nextBidFor(auction)) })}</small>

          {!isOwner && auction.status === 'open' ? (
            <form className="auction-bid-form" onSubmit={(event) => onBid(event, auction.id)}>
              <Field>
                {t('auctions.detail.bidCharacter')}
                <select value={bidCharacter} onChange={(event) => onCharacterChange(event.target.value)} required>
                  <option value="">{t('auctions.detail.selectCharacter')}</option>
                  {characters.map((character) => (
                    <option value={character.name} key={character.char_id}>
                      {t('auctions.detail.characterOption', { name: character.name, level: character.level })}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                {t('auctions.detail.yourBid')}
                <input
                  type="number"
                  min={nextBidFor(auction)}
                  step="0.01"
                  inputMode="decimal"
                  value={bidAmount}
                  onChange={(event) => onAmountChange(event.target.value)}
                  required
                />
              </Field>
              <Button type="submit" disabled={pending}>
                <Gavel aria-hidden="true" /> {pending ? t('auctions.detail.sending') : t('auctions.detail.bid')}
              </Button>
            </form>
          ) : null}

          {isOwner ? <small className="marketplace-owner-note">{t('auctions.detail.ownerNote')}</small> : null}
        </aside>
      </div>
    </article>
  )
}
