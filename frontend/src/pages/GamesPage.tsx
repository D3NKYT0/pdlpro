import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { gamesApi, inventoryApi, isApiError } from '../services/api'

export function GamesPage() {
  const queryClient = useQueryClient()
  const roulette = useQuery({ queryKey: ['roulette'], queryFn: gamesApi.roulette })
  const bonus = useQuery({ queryKey: ['daily-bonus'], queryFn: gamesApi.dailyBonus })
  const bag = useQuery({ queryKey: ['bag'], queryFn: gamesApi.bag })
  const boxes = useQuery({ queryKey: ['boxes'], queryFn: gamesApi.boxes })
  const minigames = useQuery({ queryKey: ['minigames'], queryFn: gamesApi.minigames })
  const inventories = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.dashboard() })
  const [amount, setAmount] = useState('5')
  const [diceAmount, setDiceAmount] = useState('1')
  const [diceType, setDiceType] = useState('even')
  const [inventoryId, setInventoryId] = useState('')

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['roulette'] })
    await queryClient.invalidateQueries({ queryKey: ['daily-bonus'] })
    await queryClient.invalidateQueries({ queryKey: ['bag'] })
    await queryClient.invalidateQueries({ queryKey: ['boxes'] })
    await queryClient.invalidateQueries({ queryKey: ['minigames'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
    await queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }

  async function spin() {
    try {
      const result = await gamesApi.spin()
      if (result.failed) toast.error('Sem prêmio desta vez')
      else toast.success(`Você ganhou ${result.prize?.name}`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no giro')
    }
  }

  async function buy(event: FormEvent) {
    event.preventDefault()
    try {
      await gamesApi.buyTokens(Number(amount))
      toast.success('Fichas creditadas')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível comprar fichas')
    }
  }

  async function claim() {
    try {
      const result = await gamesApi.claimDailyBonus()
      toast.success(`Bônus de R$ ${result.amount} creditado`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível resgatar')
    }
  }

  async function buyBox(id: string) {
    try {
      await gamesApi.buyBox(id)
      toast.success('Caixa comprada')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na compra')
    }
  }

  async function openBox(id: string) {
    try {
      const result = await gamesApi.openBox(id)
      toast.success(`${result.item.name} (+${result.item.enchant})`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao abrir')
    }
  }

  async function playDice(event: FormEvent) {
    event.preventDefault()
    try {
      const result = await gamesApi.dice({ bet_type: diceType, amount: Number(diceAmount) })
      toast[result.won ? 'success' : 'error'](`Dado ${result.roll} · ${result.won ? `+${result.payout}` : 'perdeu'}`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha nos dados')
    }
  }

  async function playSlots() {
    try {
      const result = await gamesApi.slots()
      toast[result.won ? 'success' : 'error'](`${result.reels.join(' | ')} · ${result.won ? `+${result.payout}` : 'nada'}`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha nos slots')
    }
  }

  async function transferBag(event: FormEvent) {
    event.preventDefault()
    try {
      const result = await gamesApi.transferBag(inventoryId)
      toast.success(`${result.moved} itens enviados ao inventário`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na transferência')
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Roleta</h1>
        <p className="stat">{roulette.data?.fichas ?? minigames.data?.fichas ?? 0} fichas</p>
        <p className="muted">Custo: {roulette.data?.cost ?? 1} · chance de falha: {roulette.data?.fail_chance ?? 20}%</p>
        <form onSubmit={buy}>
          <label className="field">
            Comprar fichas (1 = R$ 1)
            <input value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <button className="btn" type="submit">
            Comprar
          </button>
        </form>
        <p>
          <button className="btn" type="button" onClick={() => void spin()}>
            Girar
          </button>
        </p>
        <h3>Prêmios</h3>
        {(roulette.data?.prizes ?? []).map((prize) => (
          <p key={prize.id}>
            {prize.name} · {prize.rarity} · peso {prize.weight}
          </p>
        ))}
        <h2>Bônus diário</h2>
        <p>Valor: R$ {bonus.data?.amount ?? '10.00'}</p>
        {bonus.data?.claimed ? (
          <p className="muted">Você já resgatou hoje.</p>
        ) : (
          <button className="btn" type="button" onClick={() => void claim()}>
            Resgatar
          </button>
        )}
      </section>
      <section className="card">
        <h2>Caixas</h2>
        {(boxes.data?.types ?? []).map((row) => (
          <p key={row.id}>
            {row.name} — R$ {row.price} ({row.boosters_amount} boosters){' '}
            <button className="btn" type="button" onClick={() => void buyBox(row.id)}>
              Comprar
            </button>
          </p>
        ))}
        {(boxes.data?.boxes ?? []).map((row) => (
          <p key={row.id}>
            {row.type_name} · {row.remaining}/{row.total}{' '}
            <button className="btn" type="button" onClick={() => void openBox(row.id)}>
              Abrir (1 ficha)
            </button>
          </p>
        ))}
        {!boxes.data?.types.length && <p className="muted">Cadastre tipos de caixa e itens no admin.</p>}
        <h2>Dados e slots</h2>
        <form onSubmit={playDice}>
          <label className="field">
            Aposta
            <select value={diceType} onChange={(event) => setDiceType(event.target.value)}>
              <option value="even">Par</option>
              <option value="odd">Ímpar</option>
              <option value="high">Alto (4-6)</option>
              <option value="low">Baixo (1-3)</option>
            </select>
          </label>
          <label className="field">
            Fichas
            <input value={diceAmount} onChange={(event) => setDiceAmount(event.target.value)} />
          </label>
          <button className="btn" type="submit">
            Jogar dado
          </button>
        </form>
        <p>
          <button className="btn" type="button" onClick={() => void playSlots()}>
            Girar slots ({minigames.data?.slots.cost ?? 1} ficha)
          </button>
        </p>
        <h2>Bag</h2>
        {(bag.data ?? []).map((item) => (
          <p key={`${item.item_id}-${item.enchant}`}>
            {item.item_name} {item.enchant ? `+${item.enchant}` : ''} × {item.quantity}
          </p>
        ))}
        {!bag.data?.length && <p className="muted">Bag vazia.</p>}
        <form onSubmit={transferBag}>
          <label className="field">
            Enviar bag ao inventário
            <select value={inventoryId} onChange={(event) => setInventoryId(event.target.value)} required>
              <option value="">Escolha o personagem</option>
              {(inventories.data ?? []).map((row) => (
                <option key={row.inventory_id} value={row.inventory_id}>
                  {row.character_name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit">
            Transferir
          </button>
        </form>
      </section>
    </div>
  )
}
