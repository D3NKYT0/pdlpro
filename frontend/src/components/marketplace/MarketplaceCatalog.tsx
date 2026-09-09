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
                  <span className="panel-eyebrow">{isOwner ? 'Seu anúncio' : 'Personagem à venda'}</span>
                  <h3>{listing.char_name}</h3>
                  <p>{getClassName(listing.char_class)} · nível {listing.char_level}</p>
                </div>
              </div>
              <div className="marketplace-listing-card-stats">
                <span><b>{listing.char_pvp.toLocaleString('pt-BR')}</b> PvP</span>
                <span><b>{listing.char_pk.toLocaleString('pt-BR')}</b> PK</span>
                <span><b>{listing.equipment.length}</b> equips</span>
              </div>
              <div className="marketplace-listing-card-footer">
                <strong>{formatCurrency(listing.price)}</strong>
                <span className="marketplace-open-listing">
                  Ver personagem <ChevronRight aria-hidden="true" />
                </span>
              </div>
            </button>
          )
        })}
      </div>
      {!loading && !listings.length ? (
        <div className="marketplace-empty"><Store aria-hidden="true" /> Nenhum personagem à venda.</div>
      ) : null}
    </>
  )
}
