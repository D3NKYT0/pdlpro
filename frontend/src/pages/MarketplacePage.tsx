import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BadgeDollarSign,
  ChevronRight,
  Eye,
  PackageOpen,
  RefreshCcw,
  Shield,
  ShoppingCart,
  Store,
  Sword,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { ItemIcon } from '../components/ItemIcon'
import { useAuth } from '../contexts/AuthContext'
import { getClassName } from '../lib/lineage'
import { inventoryApi, isApiError, lineageApi, marketplaceApi } from '../services/api'
import type { ApiCharacterListing } from '../services/types'

const listingStatus: Record<string, { label: string; className: string }> = {
  for_sale: { label: 'À venda', className: 'for-sale' },
  sold: { label: 'Vendido', className: 'sold' },
  cancelled: { label: 'Cancelado', className: 'cancelled' },
  disputed: { label: 'Em disputa', className: 'disputed' },
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
}

function formatDate(value?: string | null) {
  if (!value) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function ListingEquipment({ equipment }: { equipment: ApiCharacterListing['equipment'] }) {
  if (!equipment.length) {
    return <div className="marketplace-equipment-empty">Nenhum equipamento registrado no momento do anúncio.</div>
  }

  return (
    <div className="marketplace-equipment-list">
      {equipment.map((item, index) => (
        <div className="marketplace-equipment-item" title={item.name} key={`${item.item_id}-${item.slot ?? index}`}>
          <ItemIcon itemId={item.item_id} name={item.name} size={38} />
          <span>
            <strong>{item.name}</strong>
            <small>{item.enchant > 0 ? `+${item.enchant}` : 'Sem encantamento'}</small>
          </span>
        </div>
      ))}
    </div>
  )
}

interface ListingDetailProps {
  listing: ApiCharacterListing
  isOwner: boolean
  pending: boolean
  onClose: () => void
  onBuy: (id: string) => void
  onCancel: (id: string) => void
}

function ListingDetail({ listing, isOwner, pending, onClose, onBuy, onCancel }: ListingDetailProps) {
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
            <button className="btn ghost" type="button" onClick={() => onCancel(listing.id)} disabled={pending}>
              {pending ? 'Cancelando...' : 'Cancelar anúncio'}
            </button>
          ) : null}
          {!isOwner && listing.status === 'for_sale' ? (
            <button className="btn" type="button" onClick={() => onBuy(listing.id)} disabled={pending}>
              <ShoppingCart aria-hidden="true" />
              {pending ? 'Processando...' : 'Comprar personagem'}
            </button>
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

export function MarketplacePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const catalog = useQuery({ queryKey: ['marketplace'], queryFn: marketplaceApi.catalog })
  const mine = useQuery({ queryKey: ['marketplace-mine'], queryFn: marketplaceApi.mine, enabled: Boolean(user) })
  const characters = useQuery({
    queryKey: ['marketplace-chars'],
    queryFn: () => lineageApi.characters(),
    enabled: Boolean(user),
  })
  const [charId, setCharId] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedListing, setSelectedListing] = useState<ApiCharacterListing | null>(null)
  const [pendingListingId, setPendingListingId] = useState('')
  const [publishing, setPublishing] = useState(false)

  const selectedCharacter = (characters.data ?? []).find((character) => String(character.char_id) === charId)
  const selectedCharacterEquipment = useQuery({
    queryKey: ['marketplace-character-equipment', charId],
    queryFn: () => inventoryApi.equipment(Number(charId)),
    enabled: Boolean(charId),
  })

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['marketplace'] }),
      queryClient.invalidateQueries({ queryKey: ['marketplace-mine'] }),
      queryClient.invalidateQueries({ queryKey: ['marketplace-chars'] }),
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    ])
  }

  async function onList(event: FormEvent) {
    event.preventDefault()
    if (publishing) return
    setPublishing(true)
    try {
      await marketplaceApi.list({ char_id: Number(charId), price, notes })
      toast.success('Personagem listado')
      setCharId('')
      setPrice('')
      setNotes('')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível listar')
    } finally {
      setPublishing(false)
    }
  }

  async function buy(id: string) {
    setPendingListingId(id)
    try {
      const updated = await marketplaceApi.buy(id)
      setSelectedListing(updated)
      toast.success('Compra concluída')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível comprar')
    } finally {
      setPendingListingId('')
    }
  }

  async function cancel(id: string) {
    setPendingListingId(id)
    try {
      const updated = await marketplaceApi.cancel(id)
      setSelectedListing(updated)
      toast.success('Venda cancelada')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível cancelar')
    } finally {
      setPendingListingId('')
    }
  }

  return (
    <div className="marketplace-page">
      <section className="card marketplace-hero">
        <div>
          <span className="panel-eyebrow">Comércio entre jogadores</span>
          <h1>Marketplace</h1>
          <p className="muted">Conheça o personagem, confira seus equipamentos e negocie com segurança.</p>
        </div>
        <button className="btn ghost" type="button" onClick={() => void refresh()}>
          <RefreshCcw aria-hidden="true" /> Atualizar
        </button>
      </section>

      <section className="card marketplace-catalog-card">
        <div className="marketplace-section-heading">
          <div>
            <span className="panel-eyebrow">Personagens disponíveis</span>
            <h2>À venda agora</h2>
          </div>
          <span>{catalog.data?.length ?? 0} anúncios</span>
        </div>

        {selectedListing ? (
          <ListingDetail
            listing={selectedListing}
            isOwner={Boolean(user && selectedListing.seller_username === user.username)}
            pending={pendingListingId === selectedListing.id}
            onClose={() => setSelectedListing(null)}
            onBuy={(id) => void buy(id)}
            onCancel={(id) => void cancel(id)}
          />
        ) : null}

        <div className="marketplace-listing-grid">
          {(catalog.data ?? []).map((listing) => {
            const isOwner = Boolean(user && listing.seller_username === user.username)
            return (
              <button
                className={`marketplace-listing-card${isOwner ? ' is-owner' : ''}`}
                type="button"
                onClick={() => setSelectedListing(listing)}
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
        {!catalog.isLoading && !catalog.data?.length ? (
          <div className="marketplace-empty"><Store aria-hidden="true" /> Nenhum personagem à venda.</div>
        ) : null}
      </section>

      {user ? (
        <aside className="marketplace-side-column">
          <section className="card marketplace-sell-card">
            <div className="marketplace-section-heading compact">
              <div>
                <span className="panel-eyebrow">Novo anúncio</span>
                <h2>Vender personagem</h2>
              </div>
              <BadgeDollarSign aria-hidden="true" />
            </div>
            <form onSubmit={onList}>
              <label className="field">
                Personagem
                <select value={charId} onChange={(event) => setCharId(event.target.value)} required>
                  <option value="">Selecione para visualizar</option>
                  {(characters.data ?? []).map((char) => (
                    <option key={char.char_id} value={char.char_id}>
                      {char.name} — nível {char.level}
                    </option>
                  ))}
                </select>
              </label>

              {selectedCharacter ? (
                <div className="marketplace-character-preview">
                  <div className="marketplace-character-preview-head">
                    <div className="marketplace-character-emblem"><UserRound aria-hidden="true" /></div>
                    <div>
                      <span className="panel-eyebrow">Prévia do anúncio</span>
                      <strong>{selectedCharacter.name}</strong>
                      <small>{getClassName(selectedCharacter.class_id)} · nível {selectedCharacter.level}</small>
                    </div>
                    <span className={`marketplace-online-state ${selectedCharacter.online ? 'online' : 'offline'}`}>
                      {selectedCharacter.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <dl className="marketplace-character-preview-stats">
                    <div><dt>PvP</dt><dd>{selectedCharacter.pvp.toLocaleString('pt-BR')}</dd></div>
                    <div><dt>PK</dt><dd>{selectedCharacter.pk.toLocaleString('pt-BR')}</dd></div>
                    <div><dt>Clã</dt><dd>{selectedCharacter.clan_name || 'Sem clã'}</dd></div>
                    <div><dt>Título</dt><dd>{selectedCharacter.title || 'Sem título'}</dd></div>
                  </dl>
                  <div className="marketplace-character-preview-equipment">
                    <span>Equipamentos que aparecerão no anúncio</span>
                    {selectedCharacterEquipment.isLoading ? <small>Carregando equipamentos...</small> : null}
                    {!selectedCharacterEquipment.isLoading ? (
                      <div>
                        {(selectedCharacterEquipment.data ?? []).slice(0, 10).map((item, index) => (
                          <ItemIcon itemId={item.item_id} name={item.name} size={32} key={`${item.item_id}-${item.slot ?? index}`} />
                        ))}
                        {!selectedCharacterEquipment.data?.length ? <small>Nenhum equipamento encontrado.</small> : null}
                      </div>
                    ) : null}
                  </div>
                  {selectedCharacter.online ? <p>O personagem precisa estar offline para ser anunciado.</p> : null}
                </div>
              ) : null}

              <label className="field">
                Preço
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0,00" required />
              </label>
              <label className="field">
                Descrição para o comprador
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Destaques, build ou observações do personagem" />
              </label>
              <button className="btn" type="submit" disabled={publishing || !selectedCharacter || selectedCharacter.online}>
                <Store aria-hidden="true" /> {publishing ? 'Publicando...' : 'Publicar anúncio'}
              </button>
            </form>
          </section>

          <section className="card marketplace-sales-card">
            <div className="marketplace-section-heading compact">
              <div>
                <span className="panel-eyebrow">Histórico</span>
                <h2>Minhas vendas</h2>
              </div>
              <PackageOpen aria-hidden="true" />
            </div>
            <div className="marketplace-sales-list">
              {(mine.data ?? []).map((listing) => {
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
                      <button className="btn ghost" type="button" onClick={() => setSelectedListing(listing)}>
                        <Eye aria-hidden="true" /> Visualizar
                      </button>
                      {listing.status === 'for_sale' ? (
                        <button className="btn ghost danger" type="button" onClick={() => void cancel(listing.id)} disabled={pendingListingId === listing.id}>
                          {pendingListingId === listing.id ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
              {!mine.isLoading && !mine.data?.length ? <div className="marketplace-empty">Você ainda não criou anúncios.</div> : null}
            </div>
          </section>
        </aside>
      ) : (
        <section className="card marketplace-auth-card">
          <p className="muted">Entre para vender ou comprar personagens.</p>
        </section>
      )}
    </div>
  )
}
