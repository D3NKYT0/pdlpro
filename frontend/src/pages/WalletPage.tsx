import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, paymentApi, walletApi } from '../services/api'

export function WalletPage() {
  const queryClient = useQueryClient()
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.me })
  const tx = useQuery({ queryKey: ['wallet-tx'], queryFn: walletApi.transactions })
  const orders = useQuery({ queryKey: ['payments'], queryFn: paymentApi.list })
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [deposit, setDeposit] = useState('')

  async function refreshWallet() {
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet-tx'] })
    await queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  async function onTransfer(event: FormEvent) {
    event.preventDefault()
    try {
      await walletApi.transfer(recipient, amount)
      toast.success('Transferência enviada')
      await refreshWallet()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na transferência')
    }
  }

  async function onDeposit(event: FormEvent) {
    event.preventDefault()
    try {
      const order = await paymentApi.create(deposit)
      await paymentApi.confirm(order.id)
      toast.success('Saldo creditado')
      setDeposit('')
      await refreshWallet()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no depósito')
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Carteira</h1>
        <div className="stat">R$ {wallet.data?.balance ?? '0.00'}</div>
        <p className="muted">Bônus: R$ {wallet.data?.bonus_balance ?? '0.00'}</p>
        <form onSubmit={onDeposit}>
          <label className="field">
            Depositar
            <input value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="50.00" required />
          </label>
          <button className="btn" type="submit">
            Gerar e confirmar pedido
          </button>
        </form>
        <form onSubmit={onTransfer}>
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
        <h2>Pedidos</h2>
        {(orders.data ?? []).map((order) => (
          <p key={order.id}>
            R$ {order.amount} — {order.status}
            {order.total_credited !== '0.00' ? ` (creditado ${order.total_credited})` : ''}
          </p>
        ))}
        {!orders.data?.length && <p className="muted">Nenhum pedido ainda.</p>}
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
