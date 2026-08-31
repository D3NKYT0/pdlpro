import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { auctionApi, inventoryApi, isApiError } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export function AuctionPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const open = useQuery({ queryKey: ['auctions'], queryFn: auctionApi.open })
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.dashboard(),
    enabled: Boolean(user),
  })
  const [inventoryId, setInventoryId] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [minBid, setMinBid] = useState('')
  const [hours, setHours] = useState('24')
  const [bidAmount, setBidAmount] = useState('')
  const [bidChar, setBidChar] = useState('')

  const selected = (inventory.data ?? []).find((row) => row.inventory_id === inventoryId)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['auctions'] })
    await queryClient.invalidateQueries({ queryKey: ['inventory'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    try {
      await auctionApi.create({
        inventory_id: inventoryId,
        item_id: Number(itemId),
        quantity: Number(quantity),
        enchant: 0,
        min_bid: minBid,
        hours: Number(hours),
      })
      toast.success('Leilão criado')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível criar o leilão')
    }
  }

  async function onBid(event: FormEvent, auctionId: string) {
    event.preventDefault()
    try {
      await auctionApi.bid(auctionId, bidAmount, bidChar)
      toast.success('Lance enviado')
      setBidAmount('')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Lance recusado')
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Leilões</h1>
        {(open.data ?? []).map((auction) => (
          <article className="card" key={auction.id}>
            <h3>
              {auction.item_name} x{auction.quantity}
            </h3>
            <p className="muted">
              Mínimo R$ {auction.min_bid}
              {auction.current_bid ? ` — atual R$ ${auction.current_bid}` : ''}
            </p>
            <p className="muted">Encerramento: {new Date(auction.ends_at).toLocaleString()}</p>
            {user && auction.seller_username !== user.username ? (
              <form onSubmit={(event) => void onBid(event, auction.id)}>
                <label className="field">
                  Personagem
                  <input value={bidChar} onChange={(e) => setBidChar(e.target.value)} required />
                </label>
                <label className="field">
                  Lance
                  <input value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} required />
                </label>
                <button className="btn" type="submit">
                  Dar lance
                </button>
              </form>
            ) : null}
          </article>
        ))}
        {!open.data?.length && <p className="muted">Nenhum leilão aberto.</p>}
      </section>
      {user ? (
        <section className="card">
          <h2>Criar leilão</h2>
          <form onSubmit={onCreate}>
            <label className="field">
              Inventário
              <select
                value={inventoryId}
                onChange={(e) => {
                  setInventoryId(e.target.value)
                  setItemId('')
                }}
                required
              >
                <option value="">Selecione</option>
                {(inventory.data ?? []).map((row) => (
                  <option key={row.inventory_id} value={row.inventory_id}>
                    {row.character_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Item
              <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
                <option value="">Selecione</option>
                {(selected?.items ?? []).map((item) => (
                  <option key={`${item.item_id}-${item.enchant}`} value={item.item_id}>
                    {item.item_name || `Item ${item.item_id}`} x{item.quantity}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Quantidade
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </label>
            <label className="field">
              Lance mínimo
              <input value={minBid} onChange={(e) => setMinBid(e.target.value)} required />
            </label>
            <label className="field">
              Duração (horas)
              <input value={hours} onChange={(e) => setHours(e.target.value)} required />
            </label>
            <button className="btn" type="submit">
              Publicar
            </button>
          </form>
        </section>
      ) : (
        <section className="card">
          <p className="muted">Entre para criar leilões ou dar lances.</p>
        </section>
      )}
    </div>
  )
}
