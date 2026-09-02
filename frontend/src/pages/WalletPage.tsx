import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Clock3,
  Coins,
  CreditCard,
  History,
  Landmark,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
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

const orderStatusLabels: Record<string, string> = {
  pending: 'Aguardando',
  processing: 'Processando',
  confirmed: 'Confirmado',
  paid: 'Pago',
  failed: 'Falhou',
  cancelled: 'Cancelado',
}

function getOrderStatus(status: string) {
  const normalized = status.toLowerCase()
  const modifier = ['confirmed', 'paid'].includes(normalized)
    ? 'is-success'
    : ['failed', 'cancelled'].includes(normalized)
      ? 'is-danger'
      : 'is-pending'
  return { label: orderStatusLabels[normalized] ?? status, modifier }
}

function getTransactionPresentation(kind: string, amount: string) {
  const numericAmount = Number(amount)
  const outgoing = numericAmount < 0 || /(saida|saída|debit|out|withdraw|purchase|spent|send)/i.test(kind)
  const absoluteAmount = Number.isFinite(numericAmount) ? Math.abs(numericAmount).toFixed(2) : amount
  return {
    outgoing,
    amount: `${outgoing ? '−' : '+'}${absoluteAmount} moedas`,
  }
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
  const [transferBusy, setTransferBusy] = useState(false)
  const brickRef = useRef<{ unmount: () => void } | null>(null)

  const methods = catalog.data?.methods ?? []
  const mp = methods.find((item) => item.id === 'mercadopago' && item.currencies.includes(currency))
  const stripe = methods.find((item) => item.id === 'stripe' && item.currencies.includes(currency))
  const mock = methods.find((item) => item.id === 'mock' && item.currencies.includes(currency))
  const paymentMethod = currency === 'USD' ? stripe?.id || mock?.id : mp?.id || mock?.id
  const paymentAvailable = Boolean(paymentMethod)
  const simulatedPayment = paymentMethod === 'mock'

  async function refreshWallet() {
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet-tx'] })
    await queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  async function startPurchase(packageId?: string) {
    if (!paymentMethod) {
      toast.error('As recargas estão temporariamente indisponíveis. Tente novamente mais tarde.')
      return
    }
    setBusy(true)
    try {
      await brickRef.current?.unmount()
      brickRef.current = null
      const created = await paymentApi.create({
        package_id: packageId,
        amount: packageId ? undefined : customAmount,
        currency,
        method: paymentMethod,
      })
      setOrder(created)
      if (created.method === 'mock' && mock?.auto_confirm) {
        const confirmed = await paymentApi.confirm(created.id)
        toast.success(`${confirmed.coins} moedas creditadas`)
        setOrder(null)
        await refreshWallet()
      } else if (created.method === 'mock') {
        toast.success('Pedido criado e aguardando confirmação.')
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
    setTransferBusy(true)
    try {
      await walletApi.transfer(recipient, amount)
      toast.success('Transferência enviada')
      setRecipient('')
      setAmount('')
      await refreshWallet()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha na transferência')
    } finally {
      setTransferBusy(false)
    }
  }

  const priceKey = currency === 'USD' ? 'price_usd' : 'price_brl'
  const packages = catalog.data?.packages ?? []
  const transactions = tx.data?.results ?? []
  const paymentOrders = orders.data ?? []

  return (
    <div className="wallet-page">
      <div className="program-actions"><Link className="btn ghost" to="/painel/wallet/jogo">Transferir moedas entre carteira e jogo ↗</Link></div>
      <section className="card wallet-hero">
        <div className="wallet-hero-copy">
          <span className="panel-eyebrow">Tesouraria do jogador</span>
          <span className="wallet-title-icon" aria-hidden="true">
            <Landmark />
          </span>
          <h1>Banco PDL</h1>
          <p>Gerencie suas moedas, recargas e transferências em um só lugar.</p>
          <div className="wallet-trust-row">
            <span><ShieldCheck aria-hidden="true" /> Pagamento protegido</span>
            <span><Clock3 aria-hidden="true" /> Crédito após confirmação</span>
          </div>
        </div>

        <div className="wallet-balance-card">
          <span className="wallet-balance-icon" aria-hidden="true"><Coins /></span>
          <div>
            <small>Saldo disponível</small>
            <strong>{wallet.data?.balance ?? '0.00'} <span>moedas</span></strong>
          </div>
          <div className="wallet-bonus-chip">
            <Sparkles aria-hidden="true" />
            <span>Bônus</span>
            <b>{wallet.data?.bonus_balance ?? '0.00'}</b>
          </div>
        </div>
      </section>

      <div className="wallet-main-grid">
        <section className="card wallet-purchase-card">
          <header className="wallet-section-heading">
            <span className="wallet-section-icon" aria-hidden="true"><CreditCard /></span>
            <div>
              <span className="panel-eyebrow">Adicionar saldo</span>
              <h2>Escolha sua recarga</h2>
              <p>Selecione a moeda de pagamento e o pacote ideal para você.</p>
            </div>
            <div className="wallet-currency-switch" role="group" aria-label="Moeda do pagamento">
              <button
                className={currency === 'BRL' ? 'is-active' : ''}
                type="button"
                aria-pressed={currency === 'BRL'}
                onClick={() => setCurrency('BRL')}
              >
                <span>R$</span> BRL
              </button>
              <button
                className={currency === 'USD' ? 'is-active' : ''}
                type="button"
                aria-pressed={currency === 'USD'}
                onClick={() => setCurrency('USD')}
              >
                <span>$</span> USD
              </button>
            </div>
          </header>

          <div className={`wallet-payment-note${paymentAvailable ? '' : ' is-unavailable'}`}>
            <ShieldCheck aria-hidden="true" />
            <span>
              <strong>{paymentAvailable ? simulatedPayment ? 'Pagamento sujeito a confirmação' : currency === 'USD' ? 'Pagamento internacional via Stripe' : 'Pagamento nacional via Mercado Pago' : 'Recargas temporariamente indisponíveis'}</strong>
              <small>{paymentAvailable ? simulatedPayment ? mock?.auto_confirm ? 'O crédito automático está habilitado neste ambiente.' : 'O saldo será adicionado somente após a aprovação do pedido.' : currency === 'USD' ? 'Cartão processado com segurança no próprio site.' : 'Pague com cartão, PIX ou boleto sem sair do painel.' : 'Nenhuma cobrança será criada enquanto o serviço de pagamento estiver indisponível.'}</small>
            </span>
          </div>

          <div className="pay-packs">
            {packages.map((pack) => (
              <button
                key={pack.id}
                className={`pay-pack ${pack.badge ? 'is-featured' : ''}`}
                type="button"
                disabled={busy || !paymentAvailable}
                aria-label={`Comprar ${pack.total_coins} moedas por ${formatMoney(pack[priceKey], currency)}`}
                onClick={() => void startPurchase(pack.id)}
              >
                {pack.badge ? <span className="pay-pack-badge"><Sparkles aria-hidden="true" /> {pack.badge}</span> : null}
                <span className="pay-pack-name">{pack.name}</span>
                <span className="pay-pack-coins"><Coins aria-hidden="true" /> {pack.total_coins}</span>
                <small>moedas</small>
                {Number(pack.bonus) > 0 ? <span className="pay-pack-bonus">+ {pack.bonus} de bônus</span> : null}
                <strong className="pay-pack-price">{formatMoney(pack[priceKey], currency)}</strong>
                <span className="pay-pack-action">{paymentAvailable ? 'Escolher pacote' : 'Indisponível'}</span>
              </button>
            ))}
          </div>

          {catalog.isLoading ? <div className="wallet-inline-state"><Clock3 aria-hidden="true" /> Carregando pacotes...</div> : null}

          <div className="wallet-custom-purchase">
            <div className="wallet-custom-copy">
              <span className="wallet-section-icon" aria-hidden="true"><Banknote /></span>
              <div>
                <strong>Prefere outro valor?</strong>
                <small>Informe quanto deseja pagar e calcularemos as moedas.</small>
              </div>
            </div>
            <form
              className="wallet-custom-form"
              onSubmit={(event) => {
                event.preventDefault()
                void startPurchase()
              }}
            >
              <label className="field">
                <span>Valor em {currency}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                  placeholder={currency === 'USD' ? '9.90' : '50.00'}
                />
              </label>
              <button className="btn" type="submit" disabled={busy || !customAmount || !paymentAvailable}>
                <CircleDollarSign aria-hidden="true" /> Comprar agora
              </button>
            </form>
          </div>

          <div className="wallet-checkout">
            {order?.method === 'mercadopago' && !order.pix_qr_code ? (
              <label className="field">
                <span>CPF ou CNPJ do pagador</span>
                <input value={document} onChange={(event) => setDocument(event.target.value)} placeholder="000.000.000-00" />
              </label>
            ) : null}
            {order?.method === 'mercadopago' ? <div id="payment-brick" /> : null}
            {order?.method === 'stripe' ? (
              <form onSubmit={(event) => void payStripe(event)}>
                <div id="stripe-element" />
                <button className="btn" type="submit" disabled={busy}>
                  <CreditCard aria-hidden="true" /> Pagar com cartão
                </button>
              </form>
            ) : null}
            {order?.pix_qr_code ? (
              <div className="wallet-pix-result">
                <h3>PIX copia e cola</h3>
                <textarea readOnly value={order.pix_qr_code} rows={3} />
                {order.pix_qr_code_base64 ? (
                  <img alt="QR Code PIX" src={`data:image/png;base64,${order.pix_qr_code_base64}`} width={180} />
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="wallet-side-column">
          <section className="card wallet-transfer-card">
            <header className="wallet-compact-heading">
              <span className="wallet-section-icon" aria-hidden="true"><Send /></span>
              <div>
                <span className="panel-eyebrow">Entre jogadores</span>
                <h2>Transferir moedas</h2>
              </div>
            </header>
            <p className="muted">Envie moedas diretamente para outro jogador usando o nome da conta.</p>
            <form className="wallet-transfer-form" onSubmit={onTransfer}>
              <label className="field">
                <span className="wallet-field-label"><UserRound aria-hidden="true" /> Destinatário</span>
                <input
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="Nome do jogador"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="field">
                <span className="wallet-field-label"><Coins aria-hidden="true" /> Quantidade</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <button className="btn" type="submit" disabled={transferBusy || !recipient || !amount}>
                <Send aria-hidden="true" /> {transferBusy ? 'Enviando...' : 'Transferir moedas'}
              </button>
              <small className="wallet-transfer-warning"><ShieldCheck aria-hidden="true" /> Confira o destinatário antes de confirmar.</small>
            </form>
          </section>

          <section className="card wallet-activity-card">
            <div className="wallet-activity-section">
              <header className="wallet-activity-heading">
                <span className="wallet-section-icon" aria-hidden="true"><ReceiptText /></span>
                <div><span className="panel-eyebrow">Recargas</span><h2>Pedidos</h2></div>
                <b>{paymentOrders.length}</b>
              </header>
              {orders.isLoading ? (
                <div className="wallet-empty-state"><Clock3 aria-hidden="true" /><span>Carregando pedidos...</span></div>
              ) : paymentOrders.length ? (
                <div className="wallet-activity-list">
                  {paymentOrders.map((row) => {
                    const status = getOrderStatus(row.status)
                    const orderCurrency = row.currency === 'USD' ? 'USD' : 'BRL'
                    return (
                      <article className="wallet-activity-item" key={row.id}>
                        <span className="wallet-row-icon" aria-hidden="true"><CircleDollarSign /></span>
                        <span className="wallet-row-copy">
                          <strong>{row.coins} moedas</strong>
                          <small>{formatMoney(row.amount, orderCurrency)} · {row.method}</small>
                        </span>
                        <span className={`wallet-status ${status.modifier}`}>{status.label}</span>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="wallet-empty-state"><ReceiptText aria-hidden="true" /><span><strong>Nenhum pedido</strong><small>Suas recargas aparecerão aqui.</small></span></div>
              )}
            </div>

            <div className="wallet-activity-section">
              <header className="wallet-activity-heading">
                <span className="wallet-section-icon" aria-hidden="true"><History /></span>
                <div><span className="panel-eyebrow">Movimentações</span><h2>Extrato</h2></div>
                <b>{transactions.length}</b>
              </header>
              {tx.isLoading ? (
                <div className="wallet-empty-state"><Clock3 aria-hidden="true" /><span>Carregando extrato...</span></div>
              ) : transactions.length ? (
                <div className="wallet-activity-list">
                  {transactions.map((row) => {
                    const presentation = getTransactionPresentation(row.kind, row.amount)
                    const DirectionIcon = presentation.outgoing ? ArrowUpRight : ArrowDownLeft
                    return (
                      <article className="wallet-activity-item" key={row.id}>
                        <span className={`wallet-row-icon ${presentation.outgoing ? 'is-outgoing' : 'is-incoming'}`} aria-hidden="true"><DirectionIcon /></span>
                        <span className="wallet-row-copy">
                          <strong>{row.description || row.kind}</strong>
                          <small>{row.kind}</small>
                        </span>
                        <span className={`wallet-transaction-value ${presentation.outgoing ? 'is-outgoing' : 'is-incoming'}`}>{presentation.amount}</span>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="wallet-empty-state"><History aria-hidden="true" /><span><strong>Extrato vazio</strong><small>Entradas e saídas serão exibidas aqui.</small></span></div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
