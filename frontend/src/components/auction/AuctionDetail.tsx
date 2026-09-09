import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import type { FormEvent } from 'react'
import {
  Clock3,
  Eye,
  Gavel,
  X,
} from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatCurrency, formatDateTime as formatDate } from '../../lib/formatters'
import type { ApiAuction } from '../../services/api'
import { auctionStatus, formatRemaining, nextBidFor } from './auctionHelpers'

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
  const status = auctionStatus[auction.status] ?? { label: auction.status, className: 'unknown' }
  const activeValue = auction.current_bid ?? auction.min_bid

  return (
    <article className="marketplace-listing-detail auction-detail" aria-label={`Detalhes de ${auction.item_name}`}>
      <div className="marketplace-listing-detail-hero">
        <div className="marketplace-detail-identity auction-detail-identity">
          <div className="auction-item-icon large">
            <ItemIcon itemId={auction.item_id} name={auction.item_name} size={64} />
          </div>
          <div>
            <span className="panel-eyebrow">Item em leilão</span>
            <h2>{auction.item_name}</h2>
            <p>
              Quantidade {auction.quantity.toLocaleString('pt-BR')}
              {auction.item_enchant > 0 ? ` · encantamento +${auction.item_enchant}` : ' · sem encantamento'}
            </p>
          </div>
        </div>
        <div className="marketplace-detail-top-actions">
          {isOwner ? <span className="marketplace-owner-badge"><Eye aria-hidden="true" /> Seu leilão</span> : null}
          <span className={`marketplace-status ${status.className}`}>{status.label}</span>
          <button className="marketplace-detail-close" type="button" onClick={onClose} aria-label="Fechar detalhes">
            <X aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="auction-detail-grid">
        <div className="auction-item-information">
          <dl className="marketplace-character-stats auction-item-stats">
            <div><dt>ID do item</dt><dd>{auction.item_id}</dd></div>
            <div><dt>Quantidade</dt><dd>{auction.quantity.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Encantamento</dt><dd>{auction.item_enchant > 0 ? `+${auction.item_enchant}` : 'Nenhum'}</dd></div>
            <div><dt>Vendedor</dt><dd>{auction.seller_username}</dd></div>
            <div><dt>Inventário de origem</dt><dd>{auction.character_name || 'Não informado'}</dd></div>
            <div><dt>Maior lance</dt><dd>{auction.highest_bidder_username || 'Ainda sem lances'}</dd></div>
          </dl>
          <div className="auction-ending-card">
            <Clock3 aria-hidden="true" />
            <div>
              <span className="panel-eyebrow">Encerramento</span>
              <strong>{formatDate(auction.ends_at)}</strong>
              <small>{formatRemaining(auction.ends_at)}</small>
            </div>
          </div>
        </div>

        <aside className="marketplace-purchase-summary auction-bid-summary">
          <span>{auction.current_bid ? 'Lance atual' : 'Valor inicial'}</span>
          <strong>{formatCurrency(activeValue)}</strong>
          <small>Lance mínimo aceito: {formatCurrency(nextBidFor(auction))}</small>

          {!isOwner && auction.status === 'open' ? (
            <form className="auction-bid-form" onSubmit={(event) => onBid(event, auction.id)}>
              <Field>
                Personagem que receberá o item
                <select value={bidCharacter} onChange={(event) => onCharacterChange(event.target.value)} required>
                  <option value="">Selecione o personagem</option>
                  {characters.map((character) => (
                    <option value={character.name} key={character.char_id}>
                      {character.name} — nível {character.level}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                Seu lance
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
                <Gavel aria-hidden="true" /> {pending ? 'Enviando...' : 'Dar lance'}
              </Button>
            </form>
          ) : null}

          {isOwner ? <small className="marketplace-owner-note">Esta é a mesma visualização apresentada aos compradores.</small> : null}
        </aside>
      </div>
    </article>
  )
}
