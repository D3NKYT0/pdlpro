import { Button } from '../ui/Button'
import {
  Eye,
  Shield,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'
import { getClassName } from '../../lib/lineage'
import type { ApiCharacterListing } from '../../services/api'
import { ListingEquipment } from './ListingEquipment'
import { listingStatus } from './marketplaceHelpers'

interface ListingDetailProps {
  listing: ApiCharacterListing
  isOwner: boolean
  pending: boolean
  onClose: () => void
  onBuy: (id: string) => void
  onCancel: (id: string) => void
}

export function ListingDetail({ listing, isOwner, pending, onClose, onBuy, onCancel }: ListingDetailProps) {
  const status = listingStatus[listing.status] ?? { label: listing.status, className: 'unknown' }

  return (
    <article className="marketplace-listing-detail" aria-label={`Detalhes de ${listing.char_name}`}>
      <div className="marketplace-listing-detail-hero">
        <div className="marketplace-detail-identity">
          <div className="marketplace-character-emblem">
            <UserRound aria-hidden="true" />
          </div>
          <div>
            <span className="panel-eyebrow">Visualização do anúncio</span>
            <h2>{listing.char_name}</h2>
            <p>{getClassName(listing.char_class)} · nível {listing.char_level}</p>
          </div>
        </div>
        <div className="marketplace-detail-top-actions">
          {isOwner ? <span className="marketplace-owner-badge"><Eye aria-hidden="true" /> Seu anúncio</span> : null}
          <span className={`marketplace-status ${status.className}`}>{status.label}</span>
          <button className="marketplace-detail-close" type="button" onClick={onClose} aria-label="Fechar detalhes">
            <X aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="marketplace-detail-grid">
        <dl className="marketplace-character-stats">
          <div><dt>Classe</dt><dd>{getClassName(listing.char_class)}</dd></div>
          <div><dt>Nível</dt><dd>{listing.char_level}</dd></div>
          <div><dt>PvP</dt><dd>{listing.char_pvp.toLocaleString('pt-BR')}</dd></div>
          <div><dt>PK</dt><dd>{listing.char_pk.toLocaleString('pt-BR')}</dd></div>
          <div><dt>Sexo</dt><dd>{listing.char_sex === 0 ? 'Masculino' : 'Feminino'}</dd></div>
          <div><dt>Clã</dt><dd>{listing.char_clan_name || 'Sem clã'}</dd></div>
        </dl>

        <aside className="marketplace-purchase-summary">
          <span>Valor do personagem</span>
          <strong>{formatCurrency(listing.price)}</strong>
          <small>Vendedor: {listing.seller_username}</small>
          {isOwner && listing.status === 'for_sale' ? (
            <Button className="ghost" type="button" onClick={() => onCancel(listing.id)} disabled={pending}>
              {pending ? 'Cancelando...' : 'Cancelar anúncio'}
            </Button>
          ) : null}
          {!isOwner && listing.status === 'for_sale' ? (
            <Button type="button" onClick={() => onBuy(listing.id)} disabled={pending}>
              <ShoppingCart aria-hidden="true" />
              {pending ? 'Processando...' : 'Comprar personagem'}
            </Button>
          ) : null}
          {isOwner ? <small className="marketplace-owner-note">Esta é a mesma visualização apresentada ao comprador.</small> : null}
        </aside>
      </div>

      <div className="marketplace-detail-copy">
        <div>
          <span className="panel-eyebrow">Título</span>
          <strong>{listing.char_title || 'Sem título'}</strong>
        </div>
        <div>
          <span className="panel-eyebrow">Descrição do vendedor</span>
          <p>{listing.notes || 'O vendedor não adicionou observações.'}</p>
        </div>
      </div>

      <section className="marketplace-detail-equipment">
        <div className="marketplace-detail-section-heading">
          <Shield aria-hidden="true" />
          <div>
            <span className="panel-eyebrow">Retrato do anúncio</span>
            <h3>Equipamentos registrados</h3>
          </div>
        </div>
        <ListingEquipment equipment={listing.equipment} />
      </section>
    </article>
  )
}
