import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { walletApi, isApiError } from '../services/api'

export function WalletPage() {
  const queryClient = useQueryClient()
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.me })
  const tx = useQuery({ queryKey: ['wallet-tx'], queryFn: walletApi.transactions })
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await walletApi.transfer(recipient, amount)
      toast.success('Transferência enviada')
      await queryClient.invalidateQueries({ queryKey: ['wallet'] })
      await queryClient.invalidateQueries({ queryKey: ['wallet-tx'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na transferência')
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Carteira</h1>
        <div className="stat">R$ {wallet.data?.balance ?? '0.00'}</div>
        <p className="muted">Bônus: R$ {wallet.data?.bonus_balance ?? '0.00'}</p>
        <form onSubmit={onSubmit}>
          <label className="field">
            Destinatário
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
          </label>
          <label className="field">
            Valor
            <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <button className="btn" type="submit">
            Transferir
          </button>
        </form>
      </section>
      <section className="card">
        <h2>Extrato</h2>
        {(tx.data?.results ?? []).map((row) => (
          <p key={row.id}>
            {row.kind} {row.amount} — {row.description}
          </p>
        ))}
        {!tx.data?.results?.length && <p className="muted">Sem movimentações.</p>}
      </section>
    </div>
  )
}
