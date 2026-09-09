import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  Store,
  Sword,
} from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'
import { getClassName } from '../../lib/lineage'
import type { ApiCharacterListing } from '../../services/api'

interface MarketplaceCatalogProps {
  listings: ApiCharacterListing[]
  username?: string | null
  loading: boolean
  onSelect: (listing: ApiCharacterListing) => void
}

export function MarketplaceCatalog({ listings, username, loading, onSelect }: MarketplaceCatalogProps) {
  const { t } = useTranslation('panel')

  return (
    <>
      <div className="marketplace-listing-grid">
        {listings.map((listing) => {
          const isOwner = Boolean(username && listing.seller_username === username)
          return (
            <button
              className={`marketplace-listing-card${isOwner ? ' is-owner' : ''}`}
              type="button"
              onClick={() => onSelect(listing)}
              key={listing.id}
            >
              <div className="marketplace-listing-card-top">
                <div className="marketplace-character-emblem"><Sword aria-hidden="true" /></div>
                <div>
                  <span className="panel-eyebrow">{isOwner ? t('marketplace.catalog.ownerEyebrow') : t('marketplace.catalog.listingEyebrow')}</span>
                  <h3>{listing.char_name}</h3>
                  <p>{t('marketplace.catalog.classLevel', { className: getClassName(listing.char_class), level: listing.char_level })}</p>
                </div>
              </div>
              <div className="marketplace-listing-card-stats">
                <span><b>{listing.char_pvp.toLocaleString('pt-BR')}</b> {t('marketplace.catalog.pvp')}</span>
                <span><b>{listing.char_pk.toLocaleString('pt-BR')}</b> {t('marketplace.catalog.pk')}</span>
                <span><b>{listing.equipment.length}</b> {t('marketplace.catalog.equips')}</span>
              </div>
              <div className="marketplace-listing-card-footer">
                <strong>{formatCurrency(listing.price)}</strong>
                <span className="marketplace-open-listing">
                  {t('marketplace.catalog.view')} <ChevronRight aria-hidden="true" />
                </span>
              </div>
            </button>
          )
        })}
      </div>
      {!loading && !listings.length ? (
        <div className="marketplace-empty"><Store aria-hidden="true" /> {t('marketplace.catalog.empty')}</div>
      ) : null}
    </>
  )
}
