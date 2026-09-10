import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import {
  Eye,
  Shield,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react'
import { formatCurrency, formatNumber } from '../../lib/formatters'
import { getClassName } from '../../lib/lineage'
import type { ApiCharacterListing } from '../../services/api'
import { ListingEquipment } from './ListingEquipment'
import { listingStatusFor } from './marketplaceHelpers'

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

      <div className="marketplace-detail-grid">
        <dl className="marketplace-character-stats">
          <div><dt>{t('marketplace.detail.class')}</dt><dd>{getClassName(listing.char_class)}</dd></div>
          <div><dt>{t('marketplace.detail.level')}</dt><dd>{listing.char_level}</dd></div>
          <div><dt>{t('marketplace.detail.pvp')}</dt><dd>{formatNumber(listing.char_pvp)}</dd></div>
          <div><dt>{t('marketplace.detail.pk')}</dt><dd>{formatNumber(listing.char_pk)}</dd></div>
          <div><dt>{t('marketplace.detail.sex')}</dt><dd>{listing.char_sex === 0 ? t('marketplace.detail.male') : t('marketplace.detail.female')}</dd></div>
          <div><dt>{t('marketplace.detail.clan')}</dt><dd>{listing.char_clan_name || t('marketplace.detail.noClan')}</dd></div>
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
      </div>

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

      <section className="marketplace-detail-equipment">
        <div className="marketplace-detail-section-heading">
          <Shield aria-hidden="true" />
          <div>
            <span className="panel-eyebrow">{t('marketplace.detail.equipmentEyebrow')}</span>
            <h3>{t('marketplace.detail.equipmentTitle')}</h3>
          </div>
        </div>
        <ListingEquipment equipment={listing.equipment} />
      </section>
    </article>
  )
}
