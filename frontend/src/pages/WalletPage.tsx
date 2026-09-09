import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../components/ui/Modal'
import { WalletActivityCard } from '../components/wallet/WalletActivityCard'
import { WalletHero } from '../components/wallet/WalletHero'
import { WalletPurchaseCard } from '../components/wallet/WalletPurchaseCard'
import { WalletTransferCard } from '../components/wallet/WalletTransferCard'
import { orderDetailEntries, transactionDetailEntries } from '../components/wallet/walletHistory'
import { useAuth } from '../contexts/AuthContext'
import { apiErrorMessage } from '../lib/errors'
import { confirmStripePayment, inferDocumentType, mountMercadoPagoBrick, sanitizeDocument } from '../lib/payments'
import { paymentApi, walletApi } from '../services/api'
import type { ApiPaymentOrder, ApiWalletTransaction } from '../services/types'

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

  const packages = catalog.data?.packages ?? []
  const transactions = tx.data?.results ?? []
  const paymentOrders = orders.data?.results ?? []
  const ordersCount = orders.data?.count ?? paymentOrders.length
  const txCount = tx.data?.count ?? transactions.length

  return (
    <div className="wallet-page">
      <WalletHero balance={wallet.data?.balance} bonusBalance={wallet.data?.bonus_balance} />

      <div className="wallet-main-grid">
        <WalletPurchaseCard
          currency={currency}
          onCurrencyChange={setCurrency}
          paymentAvailable={paymentAvailable}
          simulatedPayment={simulatedPayment}
          mockAutoConfirm={mock?.auto_confirm}
          packages={packages}
          promo={catalog.data?.promo}
          catalogLoading={catalog.isLoading}
          customAmount={customAmount}
          onCustomAmountChange={setCustomAmount}
          busy={busy}
          onStartPurchase={startPurchase}
          order={order}
          document={document}
          onDocumentChange={setDocument}
          onPayStripe={payStripe}
        />

        <aside className="wallet-side-column">
          <WalletTransferCard
            recipient={recipient}
            amount={amount}
            busy={transferBusy}
            onRecipientChange={setRecipient}
            onAmountChange={setAmount}
            onSubmit={onTransfer}
          />

          <WalletActivityCard
            ordersCount={ordersCount}
            txCount={txCount}
            ordersLoading={orders.isLoading}
            txLoading={tx.isLoading}
            paymentOrders={paymentOrders}
            transactions={transactions}
            onSelectOrder={setSelectedOrder}
            onSelectTx={setSelectedTx}
          />
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
