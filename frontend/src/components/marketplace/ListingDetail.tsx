import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import {
  Crown,
  Eye,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react'
import { formatCurrency, formatNumber } from '../../lib/formatters'
import { getClassName } from '../../lib/lineage'
import type { ApiCharacterListing } from '../../services/api'
import { ListingEquipment } from './ListingEquipment'
import { listingStatusFor } from './marketplaceHelpers'
import {
  CharacterItemDetailModal,
  type CharacterItemDetail,
} from '../character/CharacterItemDetailModal'

interface ListingDetailProps {
  listing: ApiCharacterListing
  isOwner: boolean
  pending: boolean
  onClose: () => void
  onBuy: (id: string) => void
  onCancel: (id: string) => void
}

export function ListingDetail({ listing, isOwner, pending, onClose, onBuy, onCancel }: ListingDetailProps) {
  const { t } = useTranslation('panel')
  const status = listingStatusFor(listing.status, t)
  const [selectedItem, setSelectedItem] = useState<CharacterItemDetail | null>(null)

  return (
    <article className="marketplace-listing-detail" aria-label={t('marketplace.detail.aria', { name: listing.char_name })}>
      <div className="marketplace-listing-detail-hero">
        <div className="marketplace-detail-identity">
          <div className="marketplace-character-emblem">
            <UserRound aria-hidden="true" />
          </div>
          <div>
            <span className="panel-eyebrow">{t('marketplace.detail.eyebrow')}</span>
            <h2>{listing.char_name}</h2>
            <p>{t('marketplace.detail.classLevel', { className: getClassName(listing.char_class), level: listing.char_level })}</p>
          </div>
        </div>
        <div className="marketplace-detail-top-actions">
          {isOwner ? <span className="marketplace-owner-badge"><Eye aria-hidden="true" /> {t('marketplace.detail.ownerBadge')}</span> : null}
          <span className={`marketplace-status ${status.className}`}>{status.label}</span>
          <button className="marketplace-detail-close" type="button" onClick={onClose} aria-label={t('marketplace.detail.close')}>
            <X aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="marketplace-character-layout">
        <ListingEquipment equipment={listing.equipment} onSelect={setSelectedItem} />

        <div className="marketplace-character-side">
          <dl className="character-stats">
            <div>
              <dt>{t('character.stats.title')}</dt>
              <dd>{listing.char_title || t('marketplace.detail.noTitle')}</dd>
            </div>
            <div>
              <dt>{t('character.stats.level')}</dt>
              <dd>{listing.char_level}</dd>
            </div>
            <div>
              <dt>{t('character.stats.baseClass')}</dt>
              <dd>{getClassName(listing.char_class)}</dd>
            </div>
            <div>
              <dt>{t('character.stats.sex')}</dt>
              <dd>{listing.char_sex === 1 ? t('character.female') : t('character.male')}</dd>
            </div>
            <div>
              <dt>{t('character.stats.clan')}</dt>
              <dd>
                {listing.char_is_clan_leader ? (
                  <span className="character-crest-value">
                    <Crown aria-hidden="true" />
                    {listing.char_clan_name || t('character.stats.noClan')}
                  </span>
                ) : (
                  listing.char_clan_name || t('character.stats.noClan')
                )}
              </dd>
            </div>
            <div>
              <dt>{t('character.stats.pvp')}</dt>
              <dd>{formatNumber(listing.char_pvp)}</dd>
            </div>
            <div>
              <dt>{t('character.stats.pk')}</dt>
              <dd>{formatNumber(listing.char_pk)}</dd>
            </div>
            <div>
              <dt>{t('marketplace.detail.price')}</dt>
              <dd>{formatCurrency(listing.price)}</dd>
            </div>
          </dl>

          <aside className="marketplace-purchase-summary">
            <span>{t('marketplace.detail.price')}</span>
            <strong>{formatCurrency(listing.price)}</strong>
            <small>{t('marketplace.detail.seller', { name: listing.seller_username })}</small>
            {isOwner && listing.status === 'for_sale' ? (
              <Button className="ghost" type="button" onClick={() => onCancel(listing.id)} disabled={pending}>
                {pending ? t('marketplace.detail.cancelling') : t('marketplace.detail.cancelListing')}
              </Button>
            ) : null}
            {!isOwner && listing.status === 'for_sale' ? (
              <Button type="button" onClick={() => onBuy(listing.id)} disabled={pending}>
                <ShoppingCart aria-hidden="true" />
                {pending ? t('marketplace.detail.processing') : t('marketplace.detail.buy')}
              </Button>
            ) : null}
            {isOwner ? <small className="marketplace-owner-note">{t('marketplace.detail.ownerNote')}</small> : null}
          </aside>

          <div className="marketplace-detail-copy">
            <div>
              <span className="panel-eyebrow">{t('marketplace.detail.titleEyebrow')}</span>
              <strong>{listing.char_title || t('marketplace.detail.noTitle')}</strong>
            </div>
            <div>
              <span className="panel-eyebrow">{t('marketplace.detail.notesEyebrow')}</span>
              <p>{listing.notes || t('marketplace.detail.noNotes')}</p>
            </div>
          </div>
        </div>
      </div>

      <CharacterItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </article>
  )
}
