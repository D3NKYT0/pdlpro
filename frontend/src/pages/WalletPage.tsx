import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Modal } from '../components/ui/Modal'
import { WalletActivityCard } from '../components/wallet/WalletActivityCard'
import { WalletCheckoutModal } from '../components/wallet/WalletCheckoutModal'
import { WalletHero } from '../components/wallet/WalletHero'
import { WalletPurchaseCard } from '../components/wallet/WalletPurchaseCard'
import { WalletTransferCard } from '../components/wallet/WalletTransferCard'
import { orderDetailEntries, transactionDetailEntries } from '../components/wallet/walletHistory'
import { useAuth } from '../contexts/AuthContext'
import { apiErrorMessage } from '../lib/errors'
import { confirmStripePayment, inferDocumentType, mountMercadoPagoBrick, sanitizeDocument } from '../lib/payments'
import { trackInitiateCheckout, trackPurchase } from '../lib/tracking'
import { paymentApi, walletApi } from '../services/api'
import type { ApiPaymentOrder, ApiWalletTransaction } from '../services/types'

export function WalletPage() {
  const { t } = useTranslation('panel')
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
  const [isBrickReady, setIsBrickReady] = useState(false)
  const [selectedMethodId, setSelectedMethodId] = useState<string>('')
  const brickRef = useRef<{ unmount: () => void } | null>(null)

  const methods = catalog.data?.methods ?? []
  const brlPriority = catalog.data?.brl_method_priority ?? 'user_choice'
  const availableCurrencies: ('BRL' | 'USD')[] = catalog.data
    ? (['BRL', 'USD'] as const).filter((c) => methods.some((m) => m.currencies.includes(c)))
    : ['BRL', 'USD']

  useEffect(() => {
    if (catalog.data && availableCurrencies.length > 0 && !availableCurrencies.includes(currency)) {
      setCurrency(availableCurrencies[0])
    }
  }, [availableCurrencies, currency, catalog.data])

  const methodsForCurrency = methods.filter((item) => item.currencies.includes(currency))
  const mp = methodsForCurrency.find((item) => item.id === 'mercadopago')
  const stripe = methodsForCurrency.find((item) => item.id === 'stripe')
  const mock = methodsForCurrency.find((item) => item.id === 'mock')
  const mpConfig = methods.find((item) => item.id === 'mercadopago')
  const stripeConfig = methods.find((item) => item.id === 'stripe')

  // Com os dois gateways ativos, o admin pode deixar o jogador escolher ou fixar um.
  const brlFixedMethod =
    currency === 'BRL' && (brlPriority === 'mercadopago' || brlPriority === 'stripe')
      ? brlPriority
      : null
  const lockedMethod =
    brlFixedMethod && methodsForCurrency.some((item) => item.id === brlFixedMethod)
      ? brlFixedMethod
      : null

  const defaultMethodId =
    currency === 'BRL'
      ? lockedMethod || mp?.id || stripe?.id || mock?.id || methodsForCurrency[0]?.id || ''
      : stripe?.id || mock?.id || methodsForCurrency[0]?.id || ''

  const activeMethod = lockedMethod
    ? methodsForCurrency.find((item) => item.id === lockedMethod)
    : methodsForCurrency.find((item) => item.id === selectedMethodId) ||
      methodsForCurrency.find((item) => item.id === defaultMethodId)

  const paymentMethod = activeMethod?.id
  const paymentAvailable = Boolean(paymentMethod)
  const simulatedPayment = paymentMethod === 'mock'

  async function refreshWallet() {
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet-tx'] })
    await queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  const handleCloseCheckout = useCallback(() => {
    void brickRef.current?.unmount()
    brickRef.current = null
    setIsBrickReady(false)
    setOrder(null)
  }, [])

  async function startPurchase(packageId?: string) {
    if (!paymentMethod) {
      toast.error(t('wallet.toast.rechargeUnavailable'))
      return
    }
    setBusy(true)
    try {
      await brickRef.current?.unmount()
      brickRef.current = null
      setIsBrickReady(false)
      const created = await paymentApi.create({
        package_id: packageId,
        amount: packageId ? undefined : customAmount,
        currency,
        method: paymentMethod,
      })
      setOrder(created)
      trackInitiateCheckout(Number(created.amount), created.currency)
      if (created.method === 'mock') {
        toast.success(t('wallet.toast.orderPending'))
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, t('wallet.toast.paymentStartFailed')))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setIsBrickReady(false)
    if (!order || order.method !== 'mercadopago' || !mpConfig?.public_key || order.pix_qr_code) return
    const sanitized = sanitizeDocument(document)
    if (!inferDocumentType(sanitized)) {
      void brickRef.current?.unmount()
      brickRef.current = null
      return
    }
    let cancelled = false
    void (async () => {
      try {
        await brickRef.current?.unmount()
        brickRef.current = null
        const nameParts = (user?.display_name || user?.username || '').trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || firstName
        const controller = await mountMercadoPagoBrick({
          publicKey: mpConfig.public_key,
          amount: Number(order.amount),
          email: user?.email || '',
          firstName,
          lastName,
          document: sanitized,
          containerId: 'payment-brick',
          paymentOptions: mpConfig.options,
          onReady: () => {
            if (!cancelled) setIsBrickReady(true)
          },
          onError: (message) => toast.error(message),
          onSubmit: async (formData) => {
            try {
              const rawPayer = (typeof formData.payer === 'object' && formData.payer ? formData.payer : {}) as Record<string, unknown>
              const rawIdent = (typeof rawPayer.identification === 'object' && rawPayer.identification ? rawPayer.identification : {}) as Record<string, unknown>
              const payload = {
                ...formData,
                payer: {
                  ...rawPayer,
                  email: rawPayer.email || user?.email || '',
                  first_name: rawPayer.first_name || firstName,
                  last_name: rawPayer.last_name || lastName,
                  identification: {
                    type: rawIdent.type || inferDocumentType(sanitized) || 'CPF',
                    number: sanitizeDocument(String(rawIdent.number || sanitized)),
                  },
                },
              }
              const result = await paymentApi.process(order.id, payload)
              setOrder(result)
              if (result.status === 'confirmed') {
                trackPurchase({
                  transactionId: result.id,
                  amount: Number(result.amount),
                  currency: result.currency,
                  items: result.package_code ? [{
                    id: result.package_code,
                    name: result.package_code,
                    price: Number(result.amount),
                    quantity: 1,
                  }] : undefined,
                })
                toast.success(t('wallet.toast.coinsCredited', { coins: result.coins }))
                handleCloseCheckout()
                await refreshWallet()
              } else if (result.pix_qr_code) {
                toast.success(t('wallet.toast.pixGenerated'))
              } else if (result.status === 'failed') {
                toast.error(result.gateway_message || t('wallet.toast.paymentDeclined'))
              }
            } catch (error) {
              toast.error(apiErrorMessage(error, t('wallet.toast.mercadoPagoProcessFailed')))
              throw error
            }
          },
        })
        if (cancelled) {
          await controller.unmount()
          return
        }
        brickRef.current = controller
      } catch (error) {
        toast.error(apiErrorMessage(error, t('wallet.toast.mercadoPagoFailed')))
      }
    })()
    return () => {
      cancelled = true
      void brickRef.current?.unmount()
      brickRef.current = null
    }
  }, [order?.id, order?.method, order?.pix_qr_code, sanitizeDocument(document), mpConfig?.public_key])

  useEffect(() => {
    if (!order || order.method !== 'stripe' || !stripeConfig?.public_key || !order.client_secret) return
    let unmount: (() => void) | undefined
    void (async () => {
      try {
        const session = await confirmStripePayment({
          publicKey: stripeConfig.public_key,
          clientSecret: order.client_secret || '',
          containerId: 'stripe-element',
        })
        unmount = session.unmount
        brickRef.current = session
      } catch (error) {
        toast.error(apiErrorMessage(error, t('wallet.toast.stripeOpenFailed')))
      }
    })()
    return () => unmount?.()
  }, [order?.id, order?.client_secret, stripeConfig?.public_key])

  useEffect(() => {
    if (!order || order.status === 'confirmed' || !order.pix_qr_code) return
    const timer = window.setInterval(async () => {
      const current = await paymentApi.status(order.id)
      setOrder(current)
      if (current.status === 'confirmed') {
        trackPurchase({
          transactionId: current.id,
          amount: Number(current.amount),
          currency: current.currency,
          items: current.package_code ? [{
            id: current.package_code,
            name: current.package_code,
            price: Number(current.amount),
            quantity: 1,
          }] : undefined,
        })
        toast.success(t('wallet.toast.coinsCredited', { coins: current.coins }))
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
        toast.error(result.error.message || t('wallet.toast.paymentDeclined'))
        return
      }
      const current = await paymentApi.status(order.id)
      setOrder(current.status === 'confirmed' ? null : current)
      if (current.status === 'confirmed') {
        trackPurchase({
          transactionId: current.id,
          amount: Number(current.amount),
          currency: current.currency,
          items: current.package_code ? [{
            id: current.package_code,
            name: current.package_code,
            price: Number(current.amount),
            quantity: 1,
          }] : undefined,
        })
        toast.success(t('wallet.toast.coinsCredited', { coins: current.coins }))
        await refreshWallet()
      } else {
        toast.success(t('wallet.toast.paymentSent'))
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, t('wallet.toast.stripeFailed')))
    } finally {
      setBusy(false)
    }
  }

  async function onTransfer(event: FormEvent) {
    event.preventDefault()
    setTransferBusy(true)
    try {
      await walletApi.transfer(recipient, amount)
      toast.success(t('wallet.toast.transferSent'))
      setRecipient('')
      setAmount('')
      await refreshWallet()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('wallet.toast.transferFailed')))
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
          onCurrencyChange={(c) => {
            setCurrency(c)
            setSelectedMethodId('')
          }}
          availableCurrencies={availableCurrencies}
          paymentMethod={paymentMethod}
          availableMethods={methodsForCurrency}
          onMethodChange={setSelectedMethodId}
          brlMethodFixed={lockedMethod}
          paymentAvailable={paymentAvailable}
          simulatedPayment={simulatedPayment}
          packages={packages}
          promo={catalog.data?.promo}
          catalogLoading={catalog.isLoading}
          customAmount={customAmount}
          onCustomAmountChange={setCustomAmount}
          busy={busy}
          onStartPurchase={startPurchase}
          mpOptions={mpConfig?.options}
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

      <WalletCheckoutModal
        open={Boolean(order)}
        order={order}
        onClose={handleCloseCheckout}
        document={document}
        onDocumentChange={setDocument}
        busy={busy}
        onPayStripe={payStripe}
        simulatedPayment={simulatedPayment}
        packages={packages}
        isBrickReady={isBrickReady}
      />

      <Modal open={Boolean(selectedOrder)} title={t('wallet.modal.order')} onClose={() => setSelectedOrder(null)}>
        {selectedOrder ? (
          <dl className="ui-detail-list">
            {orderDetailEntries(selectedOrder, t).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : null}
      </Modal>
      <Modal open={Boolean(selectedTx)} title={t('wallet.modal.transaction')} onClose={() => setSelectedTx(null)}>
        {selectedTx ? (
          <dl className="ui-detail-list">
            {transactionDetailEntries(selectedTx, t).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : null}
      </Modal>
    </div>
  )
}
