import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Field } from '../components/ui/Field'
import { Button, ButtonLink } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
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
import { paymentApi, walletApi } from '../services/api'
import type { ApiPaymentOrder, ApiWalletPromo, ApiWalletTransaction } from '../services/types'
import {
  formatWalletMoney,
  getOrderStatus,
  getTransactionPresentation,
  orderDetailEntries,
  transactionDetailEntries,
} from './walletHistory'

function formatMoney(value: string, currency: 'BRL' | 'USD') {
  return formatWalletMoney(value, currency)
}

function WalletPromoBanner({ promo }: { promo: ApiWalletPromo }) {
  const bannerRef = useRef<HTMLElement>(null)
  const frameRef = useRef(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  function onMouseMove(event: MouseEvent<HTMLElement>) {
    const node = bannerRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      setTilt({
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      })
    })
  }

  function onMouseLeave() {
    cancelAnimationFrame(frameRef.current)
    setTilt({ x: 0, y: 0 })
  }

  const style = {
    '--promo-mx': tilt.x.toFixed(3),
    '--promo-my': tilt.y.toFixed(3),
  } as CSSProperties

  return (
    <aside
      ref={bannerRef}
      className="wallet-promo-banner"
      aria-label={promo.title}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="wallet-promo-banner-art" aria-hidden="true" />
      <div className="wallet-promo-banner-shade" aria-hidden="true" />
      <div className="wallet-promo-banner-copy">
        <span className="panel-eyebrow">Promoção</span>
        <strong>{promo.title}</strong>
        {promo.description ? <small>{promo.description}</small> : null}
        <div className="wallet-promo-banner-offer" aria-hidden="true">
          <b>{Number(promo.percent)}%</b>
          <span>OFF</span>
        </div>
      </div>
    </aside>
  )
}

export function WalletPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.me })
  const tx = useQuery({
    queryKey: ['wallet-tx', 1, 10],
    queryFn: () => walletApi.transactions({ page: 1, page_size: 10 }),
  })
  const orders = useQuery({
    queryKey: ['payments', 1, 10],
    queryFn: () => paymentApi.list({ page: 1, page_size: 10 }),
  })
  const catalog = useQuery({ queryKey: ['payment-catalog'], queryFn: paymentApi.catalog })
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL')
  const [customAmount, setCustomAmount] = useState('')
  const [document, setDocument] = useState('')
  const [order, setOrder] = useState<ApiPaymentOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<ApiPaymentOrder | null>(null)
  const [selectedTx, setSelectedTx] = useState<ApiWalletTransaction | null>(null)
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
      toast.error(apiErrorMessage(error, 'Não foi possível iniciar o pagamento'))
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
        toast.error(apiErrorMessage(error, 'Falha ao abrir o Mercado Pago'))
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
        toast.error(apiErrorMessage(error, 'Falha ao abrir o Stripe'))
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
      toast.error(apiErrorMessage(error, 'Falha no Stripe'))
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
      toast.error(apiErrorMessage(error, 'Falha na transferência'))
    } finally {
      setTransferBusy(false)
    }
  }

  const priceKey = currency === 'USD' ? 'price_usd' : 'price_brl'
  const packages = catalog.data?.packages ?? []
  const transactions = tx.data?.results ?? []
  const paymentOrders = orders.data?.results ?? []
  const ordersCount = orders.data?.count ?? paymentOrders.length
  const txCount = tx.data?.count ?? transactions.length

  return (
    <div className="wallet-page">
      <Card className="wallet-hero">
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

        <div className="wallet-hero-aside">
          <div className="wallet-balance-card">
            <span className="wallet-balance-icon" aria-hidden="true"><Coins /></span>
            <div className="wallet-balance-copy">
              <small>Saldo disponível</small>
              <strong>{wallet.data?.balance ?? '0.00'} <span>moedas</span></strong>
            </div>
            <Link className="wallet-game-exchange" to="/painel/wallet/jogo">
              <ArrowUpRight aria-hidden="true" />
              Transferir moedas entre carteira e jogo
            </Link>
            <div className="wallet-bonus-chip">
              <Sparkles aria-hidden="true" />
              <span>Bônus</span>
              <b>{wallet.data?.bonus_balance ?? '0.00'}</b>
            </div>
          </div>
        </div>
      </Card>

      <div className="wallet-main-grid">
        <Card className="wallet-purchase-card">
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
              <Field>
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
              </Field>
              <Button type="submit" disabled={busy || !customAmount || !paymentAvailable}>
                <CircleDollarSign aria-hidden="true" /> Comprar agora
              </Button>
            </form>
          </div>

          {catalog.data?.promo ? <WalletPromoBanner promo={catalog.data.promo} /> : null}

          <div className="wallet-checkout">
            {order?.method === 'mercadopago' && !order.pix_qr_code ? (
              <Field>
                <span>CPF ou CNPJ do pagador</span>
                <input value={document} onChange={(event) => setDocument(event.target.value)} placeholder="000.000.000-00" />
              </Field>
            ) : null}
            {order?.method === 'mercadopago' ? <div id="payment-brick" /> : null}
            {order?.method === 'stripe' ? (
              <form onSubmit={(event) => void payStripe(event)}>
                <div id="stripe-element" />
                <Button type="submit" disabled={busy}>
                  <CreditCard aria-hidden="true" /> Pagar com cartão
                </Button>
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
        </Card>

        <aside className="wallet-side-column">
          <Card className="wallet-transfer-card">
            <header className="wallet-compact-heading">
              <span className="wallet-section-icon" aria-hidden="true"><Send /></span>
              <div>
                <span className="panel-eyebrow">Entre jogadores</span>
                <h2>Transferir moedas</h2>
              </div>
            </header>
            <p className="muted">Envie moedas diretamente para outro jogador usando o nome da conta.</p>
            <form className="wallet-transfer-form" onSubmit={onTransfer}>
              <Field>
                <span className="wallet-field-label"><UserRound aria-hidden="true" /> Destinatário</span>
                <input
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="Nome do jogador"
                  autoComplete="off"
                  required
                />
              </Field>
              <Field>
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
              </Field>
              <Button type="submit" disabled={transferBusy || !recipient || !amount}>
                <Send aria-hidden="true" /> {transferBusy ? 'Enviando...' : 'Transferir moedas'}
              </Button>
              <small className="wallet-transfer-warning"><ShieldCheck aria-hidden="true" /> Confira o destinatário antes de confirmar.</small>
            </form>
          </Card>

          <Card className="wallet-activity-card">
            <div className="wallet-activity-section">
              <header className="wallet-activity-heading">
                <span className="wallet-section-icon" aria-hidden="true"><ReceiptText /></span>
                <div><span className="panel-eyebrow">Recargas</span><h2>Pedidos</h2></div>
                <b>{ordersCount}</b>
              </header>
              {orders.isLoading ? (
                <div className="wallet-empty-state"><Clock3 aria-hidden="true" /><span>Carregando pedidos...</span></div>
              ) : paymentOrders.length ? (
                <div className="wallet-activity-list">
                  {paymentOrders.map((row) => {
                    const status = getOrderStatus(row.status)
                    const orderCurrency = row.currency === 'USD' ? 'USD' : 'BRL'
                    return (
                      <button
                        type="button"
                        className="wallet-activity-item"
                        key={row.id}
                        onClick={() => setSelectedOrder(row)}
                      >
                        <span className="wallet-row-icon" aria-hidden="true"><CircleDollarSign /></span>
                        <span className="wallet-row-copy">
                          <strong>{row.coins} moedas</strong>
                          <small>{formatMoney(row.amount, orderCurrency)} · {row.method}</small>
                        </span>
                        <span className={`wallet-status ${status.modifier}`}>{status.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="wallet-empty-state"><ReceiptText aria-hidden="true" /><span><strong>Nenhum pedido</strong><small>Suas recargas aparecerão aqui.</small></span></div>
              )}
              <ButtonLink to="/painel/wallet/pedidos" variant="ghost" size="sm" className="wallet-history-link">Ver todos os pedidos</ButtonLink>
            </div>

            <div className="wallet-activity-section">
              <header className="wallet-activity-heading">
                <span className="wallet-section-icon" aria-hidden="true"><History /></span>
                <div><span className="panel-eyebrow">Movimentações</span><h2>Extrato</h2></div>
                <b>{txCount}</b>
              </header>
              {tx.isLoading ? (
                <div className="wallet-empty-state"><Clock3 aria-hidden="true" /><span>Carregando extrato...</span></div>
              ) : transactions.length ? (
                <div className="wallet-activity-list">
                  {transactions.map((row) => {
                    const presentation = getTransactionPresentation(row.kind, row.amount)
                    const DirectionIcon = presentation.outgoing ? ArrowUpRight : ArrowDownLeft
                    return (
                      <button
                        type="button"
                        className="wallet-activity-item"
                        key={row.id}
                        onClick={() => setSelectedTx(row)}
                      >
                        <span className={`wallet-row-icon ${presentation.outgoing ? 'is-outgoing' : 'is-incoming'}`} aria-hidden="true"><DirectionIcon /></span>
                        <span className="wallet-row-copy">
                          <strong>{row.description || row.kind}</strong>
                          <small>{row.kind}</small>
                        </span>
                        <span className={`wallet-transaction-value ${presentation.outgoing ? 'is-outgoing' : 'is-incoming'}`}>{presentation.amount}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="wallet-empty-state"><History aria-hidden="true" /><span><strong>Extrato vazio</strong><small>Entradas e saídas serão exibidas aqui.</small></span></div>
              )}
              <ButtonLink to="/painel/wallet/extrato" variant="ghost" size="sm" className="wallet-history-link">Ver todo o extrato</ButtonLink>
            </div>
          </Card>
        </aside>
      </div>

      <Modal open={Boolean(selectedOrder)} title="Detalhe do pedido" onClose={() => setSelectedOrder(null)}>
        {selectedOrder ? (
          <dl className="ui-detail-list">
            {orderDetailEntries(selectedOrder).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : null}
      </Modal>
      <Modal open={Boolean(selectedTx)} title="Detalhe da movimentação" onClose={() => setSelectedTx(null)}>
        {selectedTx ? (
          <dl className="ui-detail-list">
            {transactionDetailEntries(selectedTx).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : null}
      </Modal>
    </div>
  )
}
