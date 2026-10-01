import i18n from '../i18n'
import { isAppLanguage } from '../i18n/locale'

const MP_SRC = 'https://sdk.mercadopago.com/js/v2'
const STRIPE_SRC = 'https://js.stripe.com/v3/'

/** Mercado Pago brick locale mapped from the app language. */
export function mercadoPagoLocale(language = i18n.language) {
  if (!isAppLanguage(language)) return 'pt-BR'
  if (language === 'en') return 'en-US'
  if (language === 'es') return 'es-AR'
  return 'pt-BR'
}

export function sanitizeDocument(value: string) {
  return value.replace(/\D/g, '')
}

export function inferDocumentType(digits: string): 'CPF' | 'CNPJ' | null {
  if (digits.length === 11) return 'CPF'
  if (digits.length === 14) return 'CNPJ'
  return null
}

export function formatDocument(value: string) {
  const digits = sanitizeDocument(value).slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
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
      existing.addEventListener('error', () => reject(new Error(i18n.t('paymentSdkError', { ns: 'common' }))), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(i18n.t('paymentSdkError', { ns: 'common' })))
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
  firstName?: string
  lastName?: string
  containerId: string
  entityType?: 'individual' | 'association'
  trackingDisabled?: boolean
  paymentOptions?: {
    pix?: boolean
    boleto?: boolean
    credit_card?: boolean
    debit_card?: boolean
    ticket?: boolean
    bankTransfer?: boolean
  }
  onSubmit: (formData: Record<string, unknown>) => Promise<void>
  onReady: () => void
  onError: (message: string) => void
}) {
  await loadMercadoPagoSdk()
  const MercadoPago = (window as any).MercadoPago
  const mp = new MercadoPago(options.publicKey, {
    locale: mercadoPagoLocale(),
    trackingDisabled: options.trackingDisabled ?? true,
  })
  const docType = inferDocumentType(sanitizeDocument(options.document))
  const entityType = options.entityType || (docType === 'CNPJ' ? 'association' : 'individual')

  const enabledMethods: Record<string, string> = {}
  const opts = options.paymentOptions
  if (!opts || opts.credit_card !== false) enabledMethods.creditCard = 'all'
  if (!opts || opts.debit_card !== false) enabledMethods.debitCard = 'all'
  if (!opts || (opts.ticket !== false && opts.boleto !== false)) enabledMethods.ticket = 'all'
  if (!opts || (opts.bankTransfer !== false && opts.pix !== false)) enabledMethods.bankTransfer = 'all'

  const paymentMethods = Object.keys(enabledMethods).length > 0
    ? enabledMethods
    : { creditCard: 'all', debitCard: 'all', ticket: 'all', bankTransfer: 'all' }

  const controller = await mp.bricks().create('payment', options.containerId, {
    initialization: {
      amount: options.amount,
      payer: {
        email: options.email,
        entityType,
        ...(options.firstName ? { firstName: options.firstName } : {}),
        ...(options.lastName ? { lastName: options.lastName } : {}),
        identification: docType ? { type: docType, number: sanitizeDocument(options.document) } : undefined,
      },
    },
    customization: {
      paymentMethods,
      visual: {
        style: {
          theme: 'dark',
          customVariables: {
            baseColor: '#c5a161',
            baseColorFirstVariant: '#d8b573',
            baseColorSecondVariant: '#a98748',
            buttonTextColor: '#090807',
            formBackgroundColor: '#12100d',
            inputBackgroundColor: '#0a0907',
            textPrimaryColor: '#f7f2e8',
            textSecondaryColor: 'rgba(247, 242, 232, 0.65)',
            outlinePrimaryColor: '#c5a161',
            outlineSecondaryColor: '#e6c77d',
            borderRadiusSmall: '2px',
            borderRadiusMedium: '3px',
            borderRadiusLarge: '4px',
            formPadding: '16px',
          },
        },
      },
    },
    callbacks: {
      onReady: options.onReady,
      onSubmit: async ({ formData }: { formData: Record<string, unknown> }) => {
        const rawPayer = (typeof formData?.payer === 'object' && formData?.payer ? formData.payer : {}) as Record<string, unknown>
        const rawIdent = (typeof rawPayer.identification === 'object' && rawPayer.identification ? rawPayer.identification : {}) as Record<string, unknown>
        const enrichedFormData = {
          ...formData,
          payer: {
            ...rawPayer,
            email: rawPayer.email || options.email,
            first_name: rawPayer.first_name || options.firstName || '',
            last_name: rawPayer.last_name || options.lastName || '',
            entity_type: rawPayer.entity_type || rawPayer.entityType || entityType,
            identification: {
              type: rawIdent.type || docType || 'CPF',
              number: sanitizeDocument(String(rawIdent.number || options.document)),
            },
          },
        }
        await options.onSubmit(enrichedFormData)
        return null
      },
      onError: (error: { message?: string }) =>
        options.onError(error?.message || i18n.t('mercadoPagoError', { ns: 'common' })),
    },
  })
  return controller as { unmount: () => Promise<void> | void }
}

export function isStripeCurrencyDecline(error: any): boolean {
  if (!error) return false

  const declineCode = (
    error.decline_code ||
    error.code ||
    error.payment_intent?.last_payment_error?.decline_code ||
    error.payment_intent?.last_payment_error?.code ||
    ''
  ).toLowerCase()

  if (declineCode === 'currency_not_supported') return true

  const message = (
    error.message ||
    error.payment_intent?.last_payment_error?.message ||
    ''
  ).toLowerCase()

  return (
    message.includes('não aceita essa moeda') ||
    message.includes('não aceita esta moeda') ||
    message.includes('não suporta essa moeda') ||
    message.includes('não suporta esta moeda') ||
    message.includes('does not support this currency') ||
    message.includes('does not support the currency') ||
    message.includes('currency not supported') ||
    message.includes('currency is not supported') ||
    message.includes('no admite esta moneda') ||
    message.includes('no acepta esta moneda') ||
    message.includes('not accept this currency') ||
    message.includes('card does not support')
  )
}

export function resolveStripeCardCountry(error: any, userCountry?: string | null): string {
  const cardCountry = (
    error?.payment_method?.card?.country ||
    error?.payment_intent?.last_payment_error?.payment_method?.card?.country ||
    userCountry ||
    ''
  ).toUpperCase()

  if (cardCountry) return cardCountry

  const message = (
    error?.message ||
    error?.payment_intent?.last_payment_error?.message ||
    ''
  ).toLowerCase()

  if (message.includes('moeda') || message.includes('cartão') || message.includes('cartao')) {
    return 'BR'
  }

  return ''
}

export function alternateStripeCurrency(
  error: any,
  currency: string,
  availableCurrencies: string[] = ['BRL', 'USD'],
  settlementCurrency = 'BRL',
  userCountry?: string | null,
): string | null {
  if (!isStripeCurrencyDecline(error)) return null
  const currentUpper = (currency || '').toUpperCase()
  const country = resolveStripeCardCountry(error, userCountry)
  const upperSettlement = (settlementCurrency || 'BRL').toUpperCase()
  const upperAvailable = availableCurrencies.map((c) => c.toUpperCase())

  if (country === 'BR') {
    if (currentUpper !== upperSettlement && upperAvailable.includes(upperSettlement)) {
      return upperSettlement
    }
    if (currentUpper !== 'BRL' && upperAvailable.includes('BRL')) {
      return 'BRL'
    }
    return null
  }

  const alternatives = upperAvailable.filter((c) => c !== currentUpper)
  if (alternatives.length === 0) return null

  const EURO_ZONE_COUNTRIES = [
    'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
    'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR',
  ]
  if (country && EURO_ZONE_COUNTRIES.includes(country) && upperAvailable.includes('EUR') && currentUpper !== 'EUR') {
    return 'EUR'
  }

  if (currentUpper === 'USD' && alternatives.includes(upperSettlement)) {
    return upperSettlement
  }
  if (alternatives.includes('USD')) {
    return 'USD'
  }
  return alternatives[0]
}

export interface ResolveInitialCurrencyOptions {
  savedCurrency?: string | null
  userCountry?: string | null
  availableCurrencies: string[]
  settlementCurrency?: string
}

export function resolveInitialCurrency({
  savedCurrency,
  userCountry,
  availableCurrencies,
  settlementCurrency = 'BRL',
}: ResolveInitialCurrencyOptions): string {
  const upperAvailable = availableCurrencies.map(c => c.toUpperCase())
  if (upperAvailable.length === 0) {
    return settlementCurrency.toUpperCase()
  }

  // 1. Preferência salva do jogador se ainda estiver ativa no catálogo
  if (savedCurrency) {
    const savedUpper = savedCurrency.toUpperCase()
    if (upperAvailable.includes(savedUpper)) {
      return savedUpper
    }
  }

  // 2. Moeda correspondente ao país da conta do jogador
  if (userCountry) {
    const countryUpper = userCountry.trim().toUpperCase()
    if (countryUpper === 'BR' && upperAvailable.includes('BRL')) {
      return 'BRL'
    }
    const EURO_ZONE_COUNTRIES = [
      'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
      'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR'
    ]
    if (EURO_ZONE_COUNTRIES.includes(countryUpper) && upperAvailable.includes('EUR')) {
      return 'EUR'
    }
    if (upperAvailable.includes('USD')) {
      return 'USD'
    }
  }

  // 3. Moeda de liquidação da loja (fallback BRL)
  const settlementUpper = settlementCurrency.toUpperCase()
  if (upperAvailable.includes(settlementUpper)) {
    return settlementUpper
  }

  return upperAvailable[0]
}

export async function confirmStripePayment(options: {
  publicKey: string
  clientSecret: string
  containerId: string
  wallets?: { googlePay?: 'auto' | 'never'; applePay?: 'auto' | 'never' }
}) {
  await loadStripeSdk()
  const Stripe = (window as any).Stripe
  const stripe = Stripe(options.publicKey)
  const elements = stripe.elements({
    clientSecret: options.clientSecret,
    appearance: { theme: 'night', variables: { colorPrimary: '#d4af37' } },
  })
  const paymentElement =
    elements.getElement('payment') ||
    elements.create('payment', {
      wallets: options.wallets || { googlePay: 'never', applePay: 'never' },
    })
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
