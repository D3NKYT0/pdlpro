import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { confirmStripePayment, inferDocumentType, mountMercadoPagoBrick, sanitizeDocument } from '../lib/payments'
import { isApiError, paymentApi, walletApi } from '../services/api'
import type { ApiPaymentOrder } from '../services/types'

function formatMoney(value: string, currency: 'BRL' | 'USD') {
  const amount = Number(value)
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function WalletPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.me })
  const tx = useQuery({ queryKey: ['wallet-tx'], queryFn: walletApi.transactions })
  const orders = useQuery({ queryKey: ['payments'], queryFn: paymentApi.list })
  const catalog = useQuery({ queryKey: ['payment-catalog'], queryFn: paymentApi.catalog })
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL')
  const [customAmount, setCustomAmount] = useState('')
  const [document, setDocument] = useState('')
  const [order, setOrder] = useState<ApiPaymentOrder | null>(null)
  const [busy, setBusy] = useState(false)
  const brickRef = useRef<{ unmount: () => void } | null>(null)

  const methods = catalog.data?.methods ?? []
  const mp = methods.find((item) => item.id === 'mercadopago' && item.currencies.includes(currency))
  const stripe = methods.find((item) => item.id === 'stripe' && item.currencies.includes(currency))
  const mock = methods.find((item) => item.id === 'mock')

  async function refreshWallet() {
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet-tx'] })
    await queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  async function startPurchase(packageId?: string) {
    setBusy(true)
    try {
      await brickRef.current?.unmount()
      brickRef.current = null
      const created = await paymentApi.create({
        package_id: packageId,
        amount: packageId ? undefined : customAmount,
        currency,
        method: currency === 'USD' ? stripe?.id || mock?.id : mp?.id || mock?.id,
      })
      setOrder(created)
      if (created.method === 'mock') {
        const confirmed = await paymentApi.confirm(created.id)
        toast.success(`${confirmed.coins} moedas creditadas`)
        setOrder(null)
        await refreshWallet()
      }
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível iniciar o pagamento')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!order || order.method !== 'mercadopago' || !mp?.public_key) return
    if (!inferDocumentType(sanitizeDocument(document))) return
    let cancelled = false
    void (async () => {
      try {
        const controller = await mountMercadoPagoBrick({
          publicKey: mp.public_key,
          amount: Number(order.amount),
          email: user?.email || '',
          document,
          containerId: 'payment-brick',
          onReady: () => undefined,
          onError: (message) => toast.error(message),
          onSubmit: async (formData) => {
            const result = await paymentApi.process(order.id, formData)
            setOrder(result)
            if (result.status === 'confirmed') {
              toast.success(`${result.coins} moedas creditadas`)
              setOrder(null)
              await refreshWallet()
            } else if (result.pix_qr_code) {
              toast.success('PIX gerado. Pague para creditar as moedas.')
            }
          },
        })
        if (cancelled) {
          await controller.unmount()
          return
        }
        brickRef.current = controller
      } catch (error) {
        toast.error(isApiError(error) ? error.message : 'Falha ao abrir o Mercado Pago')
      }
    })()
    return () => {
      cancelled = true
      void brickRef.current?.unmount()
    }
  }, [order?.id, order?.method, document, mp?.public_key])

  useEffect(() => {
    if (!order || order.method !== 'stripe' || !stripe?.public_key || !order.client_secret) return
    let unmount: (() => void) | undefined
    void (async () => {
      try {
        const session = await confirmStripePayment({
          publicKey: stripe.public_key,
          clientSecret: order.client_secret || '',
          containerId: 'stripe-element',
        })
        unmount = session.unmount
        brickRef.current = session
      } catch (error) {
        toast.error(isApiError(error) ? error.message : 'Falha ao abrir o Stripe')
      }
    })()
    return () => unmount?.()
  }, [order?.id, order?.client_secret, stripe?.public_key])

  useEffect(() => {
    if (!order || order.status === 'confirmed' || !order.pix_qr_code) return
    const timer = window.setInterval(async () => {
      const current = await paymentApi.status(order.id)
      setOrder(current)
      if (current.status === 'confirmed') {
        toast.success(`${current.coins} moedas creditadas`)
        setOrder(null)
        await refreshWallet()
      }
    }, 4000)
    return () => window.clearInterval(timer)
  }, [order?.id, order?.pix_qr_code, order?.status])

  async function payStripe(event: FormEvent) {
    event.preventDefault()
    const session = brickRef.current as { confirm?: () => Promise<{ error?: { message?: string } }> } | null
    if (!order || !session?.confirm) return
    setBusy(true)
    try {
      const result = await session.confirm()
      if (result.error) {
        toast.error(result.error.message || 'Pagamento recusado')
        return
      }
      const current = await paymentApi.status(order.id)
      setOrder(current.status === 'confirmed' ? null : current)
      if (current.status === 'confirmed') {
        toast.success(`${current.coins} moedas creditadas`)
        await refreshWallet()
      } else {
        toast.success('Pagamento enviado. Aguarde a confirmação.')
      }
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no Stripe')
    } finally {
      setBusy(false)
    }
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

  const priceKey = currency === 'USD' ? 'price_usd' : 'price_brl'

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Banco PDL</h1>
        <div className="stat">{wallet.data?.balance ?? '0.00'} moedas</div>
        <p className="muted">Bônus: {wallet.data?.bonus_balance ?? '0.00'}</p>
        <div className="pay-currency">
          <button className={`btn ${currency === 'BRL' ? '' : 'ghost'}`} type="button" onClick={() => setCurrency('BRL')}>
            BRL
          </button>
          <button className={`btn ${currency === 'USD' ? '' : 'ghost'}`} type="button" onClick={() => setCurrency('USD')}>
            USD
          </button>
        </div>
        <p className="muted">
          {currency === 'USD'
            ? 'Dólar via Stripe, no próprio site.'
            : 'Real via Mercado Pago (cartão, PIX ou boleto) no próprio site.'}
        </p>
        <div className="pay-packs">
          {(catalog.data?.packages ?? []).map((pack) => (
            <button
              key={pack.id}
              className="pay-pack"
              type="button"
              disabled={busy}
              onClick={() => void startPurchase(pack.id)}
            >
              {pack.badge ? <span className="muted">{pack.badge}</span> : null}
              <strong>{pack.name}</strong>
              <span className="stat" style={{ fontSize: '1.2rem' }}>
                {pack.total_coins} moedas
              </span>
              <span>{formatMoney(pack[priceKey], currency)}</span>
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void startPurchase()
          }}
        >
          <label className="field">
            Valor avulso ({currency})
            <input value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder={currency === 'USD' ? '9.90' : '50.00'} />
          </label>
          <button className="btn" type="submit" disabled={busy || !customAmount}>
            Comprar valor avulso
          </button>
        </form>
        {order?.method === 'mercadopago' && !order.pix_qr_code ? (
          <label className="field">
            CPF ou CNPJ
            <input value={document} onChange={(event) => setDocument(event.target.value)} placeholder="000.000.000-00" />
          </label>
        ) : null}
        <div id="payment-brick" />
        {order?.method === 'stripe' ? (
          <form onSubmit={(event) => void payStripe(event)}>
            <div id="stripe-element" />
            <button className="btn" type="submit" disabled={busy}>
              Pagar com cartão
            </button>
          </form>
        ) : null}
        {order?.pix_qr_code ? (
          <div>
            <p>PIX copia e cola</p>
            <textarea className="field" readOnly value={order.pix_qr_code} rows={3} />
            {order.pix_qr_code_base64 ? (
              <img alt="QR Code PIX" src={`data:image/png;base64,${order.pix_qr_code_base64}`} width={180} />
            ) : null}
          </div>
        ) : null}
        <form onSubmit={onTransfer}>
          <h3>Transferir moedas</h3>
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
        {(orders.data ?? []).map((row) => (
          <p key={row.id}>
            {row.coins} moedas · {row.currency} {row.amount} · {row.method} · {row.status}
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
