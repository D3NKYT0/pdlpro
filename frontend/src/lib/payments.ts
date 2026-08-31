const MP_SRC = 'https://sdk.mercadopago.com/js/v2'
const STRIPE_SRC = 'https://js.stripe.com/v3/'

export function sanitizeDocument(value: string) {
  return value.replace(/\D/g, '')
}

export function inferDocumentType(digits: string): 'CPF' | 'CNPJ' | null {
  if (digits.length === 11) return 'CPF'
  if (digits.length === 14) return 'CNPJ'
  return null
}

export function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if ((src.includes('mercadopago') && (window as any).MercadoPago) || (src.includes('stripe') && (window as any).Stripe)) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar SDK de pagamento')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar SDK de pagamento'))
    document.body.appendChild(script)
  })
}

export function loadMercadoPagoSdk() {
  return loadScript(MP_SRC)
}

export function loadStripeSdk() {
  return loadScript(STRIPE_SRC)
}

export async function mountMercadoPagoBrick(options: {
  publicKey: string
  amount: number
  email: string
  document: string
  containerId: string
  onSubmit: (formData: Record<string, unknown>) => Promise<void>
  onReady: () => void
  onError: (message: string) => void
}) {
  await loadMercadoPagoSdk()
  const MercadoPago = (window as any).MercadoPago
  const mp = new MercadoPago(options.publicKey, { locale: 'pt-BR' })
  const docType = inferDocumentType(sanitizeDocument(options.document))
  const controller = await mp.bricks().create('payment', options.containerId, {
    initialization: {
      amount: options.amount,
      payer: {
        email: options.email,
        identification: docType ? { type: docType, number: sanitizeDocument(options.document) } : undefined,
      },
    },
    customization: {
      paymentMethods: { creditCard: 'all', debitCard: 'all', ticket: 'all', bankTransfer: 'all' },
      visual: { style: { theme: 'dark' } },
    },
    callbacks: {
      onReady: options.onReady,
      onSubmit: async ({ formData }: { formData: Record<string, unknown> }) => {
        await options.onSubmit(formData)
        return null
      },
      onError: (error: { message?: string }) => options.onError(error?.message || 'Erro no Mercado Pago'),
    },
  })
  return controller as { unmount: () => Promise<void> | void }
}

export async function confirmStripePayment(options: {
  publicKey: string
  clientSecret: string
  containerId: string
}) {
  await loadStripeSdk()
  const Stripe = (window as any).Stripe
  const stripe = Stripe(options.publicKey)
  const elements = stripe.elements({
    clientSecret: options.clientSecret,
    appearance: { theme: 'night', variables: { colorPrimary: '#d4af37' } },
  })
  const paymentElement = elements.getElement('payment') || elements.create('payment')
  paymentElement.mount(`#${options.containerId}`)
  return {
    confirm: async () =>
      stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      }),
    unmount: () => paymentElement.unmount(),
  }
}
