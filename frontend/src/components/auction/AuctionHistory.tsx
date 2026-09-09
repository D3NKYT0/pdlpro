import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Eye, History } from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatCurrency, formatDateTime as formatDate } from '../../lib/formatters'
import type { ApiAuction } from '../../services/api'
import { auctionStatus } from './auctionHelpers'

interface AuctionHistoryProps {
  auctions: ApiAuction[]
  loading: boolean
  onView: (auction: ApiAuction) => void
}

export function AuctionHistory({ auctions, loading, onView }: AuctionHistoryProps) {
  return (
    <Card className="auction-history-card">
      <div className="marketplace-section-heading compact">
        <div>
          <span className="panel-eyebrow">Seus anúncios</span>
          <h2>Histórico de leilões</h2>
        </div>
        <History aria-hidden="true" />
      </div>
      <div className="marketplace-sales-list">
        {auctions.map((auction) => {
          const status = auctionStatus[auction.status] ?? { label: auction.status, className: 'unknown' }
          return (
            <article className="marketplace-sale-row auction-history-row" key={auction.id}>
              <div className="marketplace-sale-main">
                <div className="auction-item-icon small">
                  <ItemIcon itemId={auction.item_id} name={auction.item_name} size={34} />
                </div>
                <div>
                  <strong>{auction.item_name}</strong>
                  <small>x{auction.quantity.toLocaleString('pt-BR')} {auction.item_enchant > 0 ? `· +${auction.item_enchant}` : ''}</small>
                </div>
              </div>
              <div className="marketplace-sale-meta">
                <span className={`marketplace-status ${status.className}`}>{status.label}</span>
                <strong>{formatCurrency(auction.current_bid ?? auction.min_bid)}</strong>
                <small>{formatDate(auction.created_at)}</small>
              </div>
              <div className="marketplace-sale-actions">
                <Button className="ghost" type="button" onClick={() => onView(auction)}>
                  <Eye aria-hidden="true" /> Visualizar
                </Button>
              </div>
            </article>
          )
        })}
        {loading ? <div className="marketplace-empty">Carregando histórico...</div> : null}
        {!loading && !auctions.length ? <div className="marketplace-empty">Você ainda não criou leilões.</div> : null}
      </div>
    </Card>
  )
}
