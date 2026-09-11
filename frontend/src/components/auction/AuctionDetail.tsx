import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Clock3,
  Eye,
  Gavel,
  Package,
  UserRound,
  X,
} from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatCurrency, formatDateTime as formatDate, formatNumber } from '../../lib/formatters'
import { getClassName } from '../../lib/lineage'
import type { ApiAuction } from '../../services/api'
import {
  CharacterPaperdoll,
  toPaperdollItems,
} from '../character/CharacterPaperdoll'
import { CharacterBagPanel } from '../character/CharacterBagPanel'
import {
  CharacterItemDetailModal,
  type CharacterItemDetail,
} from '../character/CharacterItemDetailModal'
import type { ApiGameItem } from '../../services/api'
import { auctionDisplayName, auctionStatusFor, formatRemaining, isCharacterAuction, nextBidFor } from './auctionHelpers'

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
  const character = isCharacterAuction(auction)
  const name = auctionDisplayName(auction)
  const [selectedItem, setSelectedItem] = useState<CharacterItemDetail | null>(null)
  const equipment = character ? toPaperdollItems(auction.equipment ?? []) : []
  const bagItems: ApiGameItem[] = character
    ? (auction.bag_items ?? []).map((item) => ({
        item_id: item.item_id,
        name: item.name || `Item ${item.item_id}`,
        quantity: item.quantity ?? 1,
        enchant: item.enchant ?? 0,
        tradeable: item.tradeable ?? true,
        location: item.location ?? 'INVENTORY',
      }))
    : []

  return (
    <article className="marketplace-listing-detail auction-detail" aria-label={t('auctions.detail.aria', { name })}>
      <div className="marketplace-listing-detail-hero">
        <div className="marketplace-detail-identity auction-detail-identity">
          <div className="auction-item-icon large">
            {character ? (
              <UserRound aria-hidden="true" size={64} />
            ) : (
              <ItemIcon itemId={auction.item_id ?? 0} name={auction.item_name} size={64} />
            )}
          </div>
          <div>
            <span className="panel-eyebrow">
              {character ? t('auctions.detail.characterEyebrow') : t('auctions.detail.eyebrow')}
            </span>
            <h2>{name}</h2>
            <p>
              {character
                ? t('auctions.detail.characterLine', {
                    className: getClassName(auction.char_class ?? 0),
                    level: auction.char_level ?? 1,
                  })
                : (
                  <>
                    {t('auctions.detail.quantityLine', { quantity: formatNumber(auction.quantity) })}
                    {auction.item_enchant > 0
                      ? t('auctions.detail.enchantSuffix', { enchant: auction.item_enchant })
                      : t('auctions.detail.noEnchantSuffix')}
                  </>
                )}
            </p>
          </div>
        </div>
        <div className="marketplace-detail-top-actions">
          <span className="auction-kind-badge">
            {character ? t('auctions.kind.character') : t('auctions.kind.item')}
          </span>
          {isOwner ? <span className="marketplace-owner-badge"><Eye aria-hidden="true" /> {t('auctions.detail.ownerBadge')}</span> : null}
          <span className={`marketplace-status ${status.className}`}>{status.label}</span>
          <button className="marketplace-detail-close" type="button" onClick={onClose} aria-label={t('auctions.detail.close')}>
            <X aria-hidden="true" />
          </button>
        </div>
      </div>

      {character ? (
        <div className="auction-character-layout">
          <section className="character-equipment auction-character-equipment">
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">{t('character.equipment.eyebrow')}</span>
                <h3>{t('character.equipment.title')}</h3>
              </div>
              <span className="character-readonly-chip">
                <Eye aria-hidden="true" />
                {t('character.equipment.readonly')}
              </span>
            </div>
            <div className="character-equipment-summary">
              <Package aria-hidden="true" />
              <strong>{equipment.length}</strong>
              <span>{t('character.equipment.equipped', { count: equipment.length })}</span>
            </div>
            <CharacterPaperdoll items={equipment} onSelect={setSelectedItem} />
            <CharacterBagPanel items={bagItems} loading={false} error={false} tabsId="auction-character-bag" />
          </section>

          <div className="auction-character-side">
            <dl className="character-stats">
              <div>
                <dt>{t('character.stats.title')}</dt>
                <dd>{auction.char_title || '—'}</dd>
              </div>
              <div>
                <dt>{t('character.stats.level')}</dt>
                <dd>{auction.char_level ?? 1}</dd>
              </div>
              <div>
                <dt>{t('character.stats.baseClass')}</dt>
                <dd>{getClassName(auction.char_class ?? 0)}</dd>
              </div>
              <div>
                <dt>{t('character.stats.sex')}</dt>
                <dd>{auction.char_sex === 1 ? t('character.female') : t('character.male')}</dd>
              </div>
              <div>
                <dt>{t('character.stats.clan')}</dt>
                <dd>{auction.char_clan_name || t('character.stats.noClan')}</dd>
              </div>
              <div>
                <dt>{t('character.stats.pvp')}</dt>
                <dd>{formatNumber(auction.char_pvp ?? 0)}</dd>
              </div>
              <div>
                <dt>{t('character.stats.pk')}</dt>
                <dd>{formatNumber(auction.char_pk ?? 0)}</dd>
              </div>
              <div>
                <dt>{t('auctions.detail.seller')}</dt>
                <dd>{auction.seller_username}</dd>
              </div>
              <div>
                <dt>{t('auctions.detail.highestBid')}</dt>
                <dd>{auction.highest_bidder_username || t('auctions.detail.noBids')}</dd>
              </div>
            </dl>

            <aside className="marketplace-purchase-summary auction-bid-summary">
              <span>{auction.current_bid ? t('auctions.detail.currentBid') : t('auctions.detail.startingValue')}</span>
              <strong>{formatCurrency(activeValue)}</strong>
              <small>{t('auctions.detail.minBid', { value: formatCurrency(nextBidFor(auction)) })}</small>

              {!isOwner && auction.status === 'open' ? (
                <form className="auction-bid-form" onSubmit={(event) => onBid(event, auction.id)}>
                  <p className="muted">{t('auctions.detail.characterBidHint')}</p>
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

            <div className="auction-ending-card">
              <Clock3 aria-hidden="true" />
              <div>
                <span className="panel-eyebrow">{t('auctions.detail.endingEyebrow')}</span>
                <strong>{formatDate(auction.ends_at)}</strong>
                <small>{formatRemaining(auction.ends_at, t)}</small>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="auction-detail-grid">
          <div className="auction-item-information">
            <dl className="marketplace-character-stats auction-item-stats">
              <div><dt>{t('auctions.detail.itemId')}</dt><dd>{auction.item_id}</dd></div>
              <div><dt>{t('auctions.detail.quantity')}</dt><dd>{formatNumber(auction.quantity)}</dd></div>
              <div><dt>{t('auctions.detail.enchant')}</dt><dd>{auction.item_enchant > 0 ? `+${auction.item_enchant}` : t('auctions.detail.noEnchant')}</dd></div>
              <div><dt>{t('auctions.detail.sourceInventory')}</dt><dd>{auction.character_name || t('auctions.detail.notInformed')}</dd></div>
              <div><dt>{t('auctions.detail.seller')}</dt><dd>{auction.seller_username}</dd></div>
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
                    {characters.map((entry) => (
                      <option value={entry.name} key={entry.char_id}>
                        {t('auctions.detail.characterOption', { name: entry.name, level: entry.level })}
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
                <Button type="submit" disabled={pending || !bidCharacter}>
                  <Gavel aria-hidden="true" /> {pending ? t('auctions.detail.sending') : t('auctions.detail.bid')}
                </Button>
              </form>
            ) : null}

            {isOwner ? <small className="marketplace-owner-note">{t('auctions.detail.ownerNote')}</small> : null}
          </aside>
        </div>
      )}

      <CharacterItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </article>
  )
}
