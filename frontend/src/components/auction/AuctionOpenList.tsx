import {
  ChevronRight,
  Clock3,
  Gavel,
  PackageOpen,
  Sparkles,
} from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatCurrency } from '../../lib/formatters'
import type { ApiAuction } from '../../services/api'
import { formatRemaining } from './auctionHelpers'

interface AuctionOpenListProps {
  auctions: ApiAuction[]
  username?: string | null
  loading: boolean
  onSelect: (auction: ApiAuction) => void
}

export function AuctionOpenList({ auctions, username, loading, onSelect }: AuctionOpenListProps) {
  return (
    <>
      <div className="auction-listing-grid">
        {auctions.map((auction) => {
          const isOwner = Boolean(username && auction.seller_username === username)
          return (
            <button
              className={`auction-listing-card${isOwner ? ' is-owner' : ''}`}
              type="button"
              onClick={() => onSelect(auction)}
              key={auction.id}
            >
              <div className="auction-listing-card-head">
                <div className="auction-item-icon">
                  <ItemIcon itemId={auction.item_id} name={auction.item_name} size={48} />
                </div>
                <div>
                  <span className="panel-eyebrow">{isOwner ? 'Seu leilão' : `Vendedor: ${auction.seller_username}`}</span>
                  <h3>{auction.item_name}</h3>
                  <p>ID {auction.item_id}</p>
                </div>
              </div>
              <div className="auction-listing-stats">
                <span><PackageOpen aria-hidden="true" /><b>{auction.quantity.toLocaleString('pt-BR')}</b> unidades</span>
                <span><Sparkles aria-hidden="true" /><b>{auction.item_enchant > 0 ? `+${auction.item_enchant}` : '0'}</b> enchant</span>
                <span><Clock3 aria-hidden="true" /><b>{formatRemaining(auction.ends_at)}</b></span>
              </div>
              <div className="auction-listing-card-footer">
                <span>
                  <small>{auction.current_bid ? 'Lance atual' : 'Valor inicial'}</small>
                  <strong>{formatCurrency(auction.current_bid ?? auction.min_bid)}</strong>
                </span>
                <span className="marketplace-open-listing">Ver leilão <ChevronRight aria-hidden="true" /></span>
              </div>
            </button>
          )
        })}
      </div>
      {loading ? <div className="marketplace-empty">Carregando leilões...</div> : null}
      {!loading && !auctions.length ? (
        <div className="marketplace-empty"><Gavel aria-hidden="true" /> Nenhum leilão aberto.</div>
      ) : null}
    </>
  )
}
