import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { inventoryApi, isApiError, lineageApi } from '../services/api'

export function InventoryPage() {
  const queryClient = useQueryClient()
  const dashboard = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.dashboard() })
  const accounts = useQuery({ queryKey: ['lineage-accounts'], queryFn: lineageApi.accounts })
  const login = accounts.data?.accounts[0]?.login
  const characters = useQuery({
    queryKey: ['characters', login],
    queryFn: () => lineageApi.characters(login),
    enabled: Boolean(login),
  })
  const [charId, setCharId] = useState<number | ''>('')
  const [itemId, setItemId] = useState('57')
  const [quantity, setQuantity] = useState('1')

  const gameItems = useQuery({
    queryKey: ['game-items', charId],
    queryFn: () => inventoryApi.gameItems(Number(charId), login),
    enabled: Boolean(charId),
  })

  async function onWithdraw(event: FormEvent) {
    event.preventDefault()
    try {
      await inventoryApi.withdraw({
        login,
        char_id: Number(charId),
        item_id: Number(itemId),
        quantity: Number(quantity),
      })
      toast.success('Item retirado para o painel')
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      await queryClient.invalidateQueries({ queryKey: ['game-items'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na retirada')
    }
  }

  async function onDeposit(inventoryId: string, depositItemId: number, enchant: number) {
    try {
      await inventoryApi.deposit({
        login,
        inventory_id: inventoryId,
        item_id: depositItemId,
        quantity: 1,
        enchant,
      })
      toast.success('Item enviado ao personagem')
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no depósito')
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h1>Inventário</h1>
        <form onSubmit={onWithdraw}>
          <label className="field">
            Personagem
            <select value={charId} onChange={(e) => setCharId(e.target.value ? Number(e.target.value) : '')} required>
              <option value="">Selecione</option>
              {(characters.data ?? []).map((char) => (
                <option key={char.char_id} value={char.char_id}>
                  {char.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Item ID
            <input value={itemId} onChange={(e) => setItemId(e.target.value)} required />
          </label>
          <label className="field">
            Quantidade
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </label>
          <button className="btn" type="submit">
            Retirar do jogo
          </button>
        </form>
        {gameItems.data?.length ? (
          <p className="muted">
            No personagem:{' '}
            {gameItems.data.map((item) => `${item.name} x${item.quantity}`).join(', ')}
          </p>
        ) : null}
      </section>
      {(dashboard.data ?? []).map((row) => (
        <section className="card" key={row.inventory_id}>
          <h2>{row.character_name}</h2>
          {row.items.map((item) => (
            <p key={item.id}>
              {item.item_name || `Item ${item.item_id}`} +{item.enchant} ×{item.quantity}{' '}
              <button className="btn ghost" type="button" onClick={() => void onDeposit(row.inventory_id, item.item_id, item.enchant)}>
                Enviar ao jogo
              </button>
            </p>
          ))}
          {!row.items.length && <p className="muted">Vazio.</p>}
        </section>
      ))}
    </div>
  )
}
