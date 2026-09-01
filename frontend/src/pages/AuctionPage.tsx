import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BadgeDollarSign,
  ChevronRight,
  Clock3,
  Eye,
  Gavel,
  History,
  PackageOpen,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { ItemIcon } from '../components/ItemIcon'
import { useAuth } from '../contexts/AuthContext'
import { auctionApi, inventoryApi, isApiError, lineageApi } from '../services/api'
import type { ApiAuction } from '../services/types'

const auctionStatus: Record<string, { label: string; className: string }> = {
  open: { label: 'Aberto', className: 'open' },
  finished: { label: 'Finalizado', className: 'finished' },
  cancelled: { label: 'Cancelado', className: 'cancelled' },
}

function formatCurrency(value: string | null) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatRemaining(value: string) {
  const milliseconds = new Date(value).getTime() - Date.now()
  if (milliseconds <= 0) return 'Encerrando'
  const totalMinutes = Math.ceil(milliseconds / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h restantes`
  if (hours > 0) return `${hours}h ${minutes}min restantes`
  return `${minutes}min restantes`
}

function nextBidFor(auction: ApiAuction) {
  return (Math.max(Number(auction.current_bid ?? 0), Number(auction.min_bid)) + 0.01).toFixed(2)
}

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

function AuctionDetail({
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
              <label className="field">
                Personagem que receberá o item
                <select value={bidCharacter} onChange={(event) => onCharacterChange(event.target.value)} required>
                  <option value="">Selecione o personagem</option>
                  {characters.map((character) => (
                    <option value={character.name} key={character.char_id}>
                      {character.name} — nível {character.level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
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
              </label>
              <button className="btn" type="submit" disabled={pending}>
                <Gavel aria-hidden="true" /> {pending ? 'Enviando...' : 'Dar lance'}
              </button>
            </form>
          ) : null}

          {isOwner ? <small className="marketplace-owner-note">Esta é a mesma visualização apresentada aos compradores.</small> : null}
        </aside>
      </div>
    </article>
  )
}

export function AuctionPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const open = useQuery({ queryKey: ['auctions'], queryFn: auctionApi.open })
  const mine = useQuery({ queryKey: ['auctions-mine'], queryFn: auctionApi.mine, enabled: Boolean(user) })
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.dashboard(),
    enabled: Boolean(user),
  })
  const characters = useQuery({
    queryKey: ['auction-characters'],
    queryFn: () => lineageApi.characters(),
    enabled: Boolean(user),
  })
  const [inventoryId, setInventoryId] = useState('')
  const [itemKey, setItemKey] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [minBid, setMinBid] = useState('')
  const [hours, setHours] = useState('24')
  const [selectedAuctionId, setSelectedAuctionId] = useState('')
  const [bidAmount, setBidAmount] = useState('')
  const [bidCharacter, setBidCharacter] = useState('')
  const [creating, setCreating] = useState(false)
  const [bidding, setBidding] = useState(false)

  const selectedInventory = (inventory.data ?? []).find((row) => row.inventory_id === inventoryId)
  const selectedItem = (selectedInventory?.items ?? []).find(
    (item) => `${item.item_id}:${item.enchant}` === itemKey,
  )
  const selectedAuction = [...(open.data ?? []), ...(mine.data ?? [])].find(
    (auction) => auction.id === selectedAuctionId,
  )

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auctions'] }),
      queryClient.invalidateQueries({ queryKey: ['auctions-mine'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    ])
  }

  function viewAuction(auction: ApiAuction) {
    setSelectedAuctionId(auction.id)
    setBidAmount(nextBidFor(auction))
    if (!bidCharacter && characters.data?.length === 1) setBidCharacter(characters.data[0].name)
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (!selectedItem) return
    setCreating(true)
    try {
      const created = await auctionApi.create({
        inventory_id: inventoryId,
        item_id: selectedItem.item_id,
        quantity: Number(quantity),
        enchant: selectedItem.enchant,
        min_bid: minBid,
        hours: Number(hours),
      })
      toast.success('Leilão criado')
      setSelectedAuctionId(created.id)
      setInventoryId('')
      setItemKey('')
      setQuantity('1')
      setMinBid('')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível criar o leilão')
    } finally {
      setCreating(false)
    }
  }

  async function onBid(event: FormEvent, auctionId: string) {
    event.preventDefault()
    setBidding(true)
    try {
      await auctionApi.bid(auctionId, bidAmount, bidCharacter)
      toast.success('Lance enviado')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Lance recusado')
    } finally {
      setBidding(false)
    }
  }

  return (
    <div className="marketplace-page auction-page">
      <section className="card marketplace-hero auction-hero">
        <div>
          <span className="panel-eyebrow">Negociação de itens</span>
          <h1>Leilões</h1>
          <p className="muted">Confira o item, acompanhe os lances e escolha quem receberá o prêmio.</p>
        </div>
        <button className="btn ghost" type="button" onClick={() => void refresh()}>
          <RefreshCcw aria-hidden="true" /> Atualizar
        </button>
      </section>

      <section className="card marketplace-catalog-card auction-catalog-card">
        <div className="marketplace-section-heading">
          <div>
            <span className="panel-eyebrow">Itens disponíveis</span>
            <h2>Leilões abertos</h2>
          </div>
          <span>{open.data?.length ?? 0} anúncios</span>
        </div>

        {selectedAuction ? (
          <AuctionDetail
            auction={selectedAuction}
            isOwner={Boolean(user && selectedAuction.seller_username === user.username)}
            bidAmount={bidAmount}
            bidCharacter={bidCharacter}
            characters={characters.data ?? []}
            pending={bidding}
            onAmountChange={setBidAmount}
            onCharacterChange={setBidCharacter}
            onClose={() => setSelectedAuctionId('')}
            onBid={(event, auctionId) => void onBid(event, auctionId)}
          />
        ) : null}

        <div className="auction-listing-grid">
          {(open.data ?? []).map((auction) => {
            const isOwner = Boolean(user && auction.seller_username === user.username)
            return (
              <button
                className={`auction-listing-card${isOwner ? ' is-owner' : ''}`}
                type="button"
                onClick={() => viewAuction(auction)}
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
        {open.isLoading ? <div className="marketplace-empty">Carregando leilões...</div> : null}
        {!open.isLoading && !open.data?.length ? (
          <div className="marketplace-empty"><Gavel aria-hidden="true" /> Nenhum leilão aberto.</div>
        ) : null}
      </section>

      {user ? (
        <aside className="marketplace-side-column auction-side-column">
          <section className="card auction-create-card">
            <div className="marketplace-section-heading compact">
              <div>
                <span className="panel-eyebrow">Novo anúncio</span>
                <h2>Criar leilão</h2>
              </div>
              <BadgeDollarSign aria-hidden="true" />
            </div>
            <form onSubmit={onCreate}>
              <label className="field">
                Inventário do personagem
                <select
                  value={inventoryId}
                  onChange={(event) => {
                    setInventoryId(event.target.value)
                    setItemKey('')
                    setQuantity('1')
                  }}
                  required
                >
                  <option value="">Selecione o inventário</option>
                  {(inventory.data ?? []).map((row) => (
                    <option key={row.inventory_id} value={row.inventory_id}>
                      {row.character_name} — {row.items.length} itens
                    </option>
                  ))}
                </select>
              </label>

              {selectedInventory ? (
                <div className="auction-inventory-summary">
                  <UserRound aria-hidden="true" />
                  <div>
                    <span className="panel-eyebrow">Inventário selecionado</span>
                    <strong>{selectedInventory.character_name}</strong>
                    <small>{selectedInventory.items.length} tipos de item disponíveis</small>
                  </div>
                </div>
              ) : null}

              <label className="field">
                Item
                <select
                  value={itemKey}
                  onChange={(event) => {
                    setItemKey(event.target.value)
                    setQuantity('1')
                  }}
                  required
                  disabled={!selectedInventory}
                >
                  <option value="">Selecione o item</option>
                  {(selectedInventory?.items ?? []).map((item) => (
                    <option key={`${item.id}-${item.item_id}-${item.enchant}`} value={`${item.item_id}:${item.enchant}`}>
                      {item.item_name || `Item ${item.item_id}`} {item.enchant > 0 ? `+${item.enchant}` : ''} — x{item.quantity}
                    </option>
                  ))}
                </select>
              </label>

              {selectedItem ? (
                <div className="auction-selected-item">
                  <div className="auction-item-icon large">
                    <ItemIcon itemId={selectedItem.item_id} name={selectedItem.item_name} size={64} />
                  </div>
                  <div>
                    <span className="panel-eyebrow">Item que será anunciado</span>
                    <strong>{selectedItem.item_name || `Item ${selectedItem.item_id}`}</strong>
                    <small>ID {selectedItem.item_id} · disponível x{selectedItem.quantity.toLocaleString('pt-BR')}</small>
                    <span>{selectedItem.enchant > 0 ? `Encantamento +${selectedItem.enchant}` : 'Sem encantamento'}</span>
                  </div>
                </div>
              ) : null}

              <div className="auction-form-grid">
                <label className="field">
                  Quantidade
                  <input
                    type="number"
                    min="1"
                    max={selectedItem?.quantity}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  Duração
                  <select value={hours} onChange={(event) => setHours(event.target.value)} required>
                    <option value="1">1 hora</option>
                    <option value="6">6 horas</option>
                    <option value="12">12 horas</option>
                    <option value="24">24 horas</option>
                    <option value="48">2 dias</option>
                    <option value="72">3 dias</option>
                    <option value="168">7 dias</option>
                  </select>
                </label>
              </div>
              <label className="field">
                Lance inicial
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={minBid}
                  onChange={(event) => setMinBid(event.target.value)}
                  placeholder="0,00"
                  required
                />
              </label>
              <div className="auction-security-note">
                <ShieldCheck aria-hidden="true" />
                <span>O item sai do inventário do painel e fica reservado até o encerramento.</span>
              </div>
              <button className="btn" type="submit" disabled={!selectedItem || creating}>
                <Gavel aria-hidden="true" /> {creating ? 'Publicando...' : 'Publicar leilão'}
              </button>
            </form>
          </section>

          <section className="card auction-history-card">
            <div className="marketplace-section-heading compact">
              <div>
                <span className="panel-eyebrow">Seus anúncios</span>
                <h2>Histórico de leilões</h2>
              </div>
              <History aria-hidden="true" />
            </div>
            <div className="marketplace-sales-list">
              {(mine.data ?? []).map((auction) => {
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
                      <button className="btn ghost" type="button" onClick={() => viewAuction(auction)}>
                        <Eye aria-hidden="true" /> Visualizar
                      </button>
                    </div>
                  </article>
                )
              })}
              {mine.isLoading ? <div className="marketplace-empty">Carregando histórico...</div> : null}
              {!mine.isLoading && !mine.data?.length ? <div className="marketplace-empty">Você ainda não criou leilões.</div> : null}
            </div>
          </section>
        </aside>
      ) : (
        <section className="card marketplace-auth-card">
          <p className="muted">Entre para criar leilões ou dar lances.</p>
        </section>
      )}
    </div>
  )
}
