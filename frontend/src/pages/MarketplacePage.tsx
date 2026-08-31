import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, lineageApi, marketplaceApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export function MarketplacePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const catalog = useQuery({ queryKey: ['marketplace'], queryFn: marketplaceApi.catalog })
  const mine = useQuery({
    queryKey: ['marketplace-mine'],
    queryFn: marketplaceApi.mine,
    enabled: Boolean(user),
  })
  const characters = useQuery({
    queryKey: ['marketplace-chars'],
    queryFn: () => lineageApi.characters(),
    enabled: Boolean(user),
  })
  const [charId, setCharId] = useState('')
  const [price, setPrice] = useState('')

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    await queryClient.invalidateQueries({ queryKey: ['marketplace-mine'] })
    await queryClient.invalidateQueries({ queryKey: ['marketplace-chars'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  async function onList(event: FormEvent) {
    event.preventDefault()
    try {
      await marketplaceApi.list({ char_id: Number(charId), price })
      toast.success('Personagem listado')
      setPrice('')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível listar')
    }
  }

  async function buy(id: string) {
    try {
      await marketplaceApi.buy(id)
      toast.success('Compra concluída')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível comprar')
    }
  }

  async function cancel(id: string) {
    try {
      await marketplaceApi.cancel(id)
      toast.success('Venda cancelada')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível cancelar')
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Marketplace</h1>
        <div className="grid">
          {(catalog.data ?? []).map((listing) => (
            <article className="card" key={listing.id}>
              <h3>{listing.char_name}</h3>
              <p className="muted">
                Nv. {listing.char_level} — R$ {listing.price}
              </p>
              <p className="muted">Vendedor: {listing.seller_username}</p>
              {user && listing.seller_username !== user.username ? (
                <button className="btn" type="button" onClick={() => void buy(listing.id)}>
                  Comprar
                </button>
              ) : null}
            </article>
          ))}
        </div>
        {!catalog.data?.length && <p className="muted">Nenhum personagem à venda.</p>}
      </section>
      {user ? (
        <section className="card">
          <h2>Vender personagem</h2>
          <form onSubmit={onList}>
            <label className="field">
              Personagem
              <select value={charId} onChange={(e) => setCharId(e.target.value)} required>
                <option value="">Selecione</option>
                {(characters.data ?? []).map((char) => (
                  <option key={char.char_id} value={char.char_id}>
                    {char.name} (nv. {char.level})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Preço
              <input value={price} onChange={(e) => setPrice(e.target.value)} required />
            </label>
            <button className="btn" type="submit">
              Listar
            </button>
          </form>
          <h2>Minhas vendas</h2>
          {(mine.data ?? []).map((listing) => (
            <p key={listing.id}>
              {listing.char_name} — {listing.status} — R$ {listing.price}
              {listing.status === 'for_sale' ? (
                <>
                  {' '}
                  <button className="btn ghost" type="button" onClick={() => void cancel(listing.id)}>
                    Cancelar
                  </button>
                </>
              ) : null}
            </p>
          ))}
        </section>
      ) : (
        <section className="card">
          <p className="muted">Entre para vender ou comprar personagens.</p>
        </section>
      )}
    </div>
  )
}
