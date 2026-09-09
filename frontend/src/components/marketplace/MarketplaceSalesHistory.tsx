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
import { listingStatus } from './marketplaceHelpers'

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
  return (
    <Card className="marketplace-sales-card">
      <div className="marketplace-section-heading compact">
        <div>
          <span className="panel-eyebrow">Histórico</span>
          <h2>Minhas vendas</h2>
        </div>
        <PackageOpen aria-hidden="true" />
      </div>
      <div className="marketplace-sales-list">
        {listings.map((listing) => {
          const status = listingStatus[listing.status] ?? { label: listing.status, className: 'unknown' }
          return (
            <article className="marketplace-sale-row" key={listing.id}>
              <div className="marketplace-sale-main">
                <div className="marketplace-character-emblem small"><UsersRound aria-hidden="true" /></div>
                <div>
                  <strong>{listing.char_name}</strong>
                  <small>{getClassName(listing.char_class)} · nível {listing.char_level}</small>
                </div>
              </div>
              <div className="marketplace-sale-meta">
                <span className={`marketplace-status ${status.className}`}>{status.label}</span>
                <strong>{formatCurrency(listing.price)}</strong>
                <small>{formatDate(listing.sold_at || listing.created_at)}</small>
              </div>
              <div className="marketplace-sale-actions">
                <Button className="ghost" type="button" onClick={() => onView(listing)}>
                  <Eye aria-hidden="true" /> Visualizar
                </Button>
                {listing.status === 'for_sale' ? (
                  <Button className="ghost danger" type="button" onClick={() => onCancel(listing.id)} disabled={pendingListingId === listing.id}>
                    {pendingListingId === listing.id ? 'Cancelando...' : 'Cancelar'}
                  </Button>
                ) : null}
              </div>
            </article>
          )
        })}
        {!loading && !listings.length ? <div className="marketplace-empty">Você ainda não criou anúncios.</div> : null}
      </div>
    </Card>
  )
}
