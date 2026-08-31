import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { gamesApi, isApiError } from '../services/api'

export function GamesPage() {
  const queryClient = useQueryClient()
  const roulette = useQuery({ queryKey: ['roulette'], queryFn: gamesApi.roulette })
  const bonus = useQuery({ queryKey: ['daily-bonus'], queryFn: gamesApi.dailyBonus })
  const bag = useQuery({ queryKey: ['bag'], queryFn: gamesApi.bag })
  const [amount, setAmount] = useState('5')

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['roulette'] })
    await queryClient.invalidateQueries({ queryKey: ['daily-bonus'] })
    await queryClient.invalidateQueries({ queryKey: ['bag'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
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

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Roleta</h1>
        <p className="stat">{roulette.data?.fichas ?? 0} fichas</p>
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
        {!roulette.data?.prizes.length && <p className="muted">Cadastre prêmios no admin.</p>}
      </section>
      <section className="card">
        <h2>Bônus diário</h2>
        <p>Valor: R$ {bonus.data?.amount ?? '10.00'}</p>
        {bonus.data?.claimed ? (
          <p className="muted">Você já resgatou hoje.</p>
        ) : (
          <button className="btn" type="button" onClick={() => void claim()}>
            Resgatar
          </button>
        )}
        <h2>Bag</h2>
        {(bag.data ?? []).map((item) => (
          <p key={`${item.item_id}-${item.enchant}`}>
            {item.item_name} {item.enchant ? `+${item.enchant}` : ''} × {item.quantity}
          </p>
        ))}
        {!bag.data?.length && <p className="muted">Bag vazia.</p>}
      </section>
    </div>
  )
}
