import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import {
  Eye,
  PackageOpen,
  UsersRound,
} from 'lucide-react'
import { formatCurrency, formatDateTime as formatDate } from '../../lib/formatters'
import { getClassName } from '../../lib/lineage'
import type { ApiCharacterListing } from '../../services/api'
import { listingStatusFor } from './marketplaceHelpers'

interface MarketplaceSalesHistoryProps {
  listings: ApiCharacterListing[]
  loading: boolean
  pendingListingId: string
  onView: (listing: ApiCharacterListing) => void
  onCancel: (id: string) => void
}

export function MarketplaceSalesHistory({
  listings,
  loading,
  pendingListingId,
  onView,
  onCancel,
}: MarketplaceSalesHistoryProps) {
  const { t } = useTranslation('panel')
  const { t: tCommon } = useTranslation('common')

  return (
    <Card className="marketplace-sales-card">
      <div className="marketplace-section-heading compact">
        <div>
          <span className="panel-eyebrow">{t('marketplace.sales.eyebrow')}</span>
          <h2>{t('marketplace.sales.title')}</h2>
        </div>
        <PackageOpen aria-hidden="true" />
      </div>
      <div className="marketplace-sales-list">
        {listings.map((listing) => {
          const status = listingStatusFor(listing.status, t)
          return (
            <article className="marketplace-sale-row" key={listing.id}>
              <div className="marketplace-sale-main">
                <div className="marketplace-character-emblem small"><UsersRound aria-hidden="true" /></div>
                <div>
                  <strong>{listing.char_name}</strong>
                  <small>{t('marketplace.sales.classLevel', { className: getClassName(listing.char_class), level: listing.char_level })}</small>
                </div>
              </div>
              <div className="marketplace-sale-meta">
                <span className={`marketplace-status ${status.className}`}>{status.label}</span>
                <strong>{formatCurrency(listing.price)}</strong>
                <small>{formatDate(listing.sold_at || listing.created_at)}</small>
              </div>
              <div className="marketplace-sale-actions">
                <Button className="ghost" type="button" onClick={() => onView(listing)}>
                  <Eye aria-hidden="true" /> {t('marketplace.sales.view')}
                </Button>
                {listing.status === 'for_sale' ? (
                  <Button className="ghost danger" type="button" onClick={() => onCancel(listing.id)} disabled={pendingListingId === listing.id}>
                    {pendingListingId === listing.id ? t('marketplace.sales.cancelling') : tCommon('cancel')}
                  </Button>
                ) : null}
              </div>
            </article>
          )
        })}
        {!loading && !listings.length ? <div className="marketplace-empty">{t('marketplace.sales.empty')}</div> : null}
      </div>
    </Card>
  )
}
