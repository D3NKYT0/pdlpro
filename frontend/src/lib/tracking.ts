import { hasAnalyticsConsent, hasMarketingConsent } from './cookieConsent'

export interface TrackingEnv {
  VITE_GTAG_ID?: string
  VITE_GOOGLE_ADS_ID?: string
  VITE_GOOGLE_ADS_CONVERSION_LABEL?: string
  VITE_GTM_ID?: string
  VITE_META_PIXEL_ID?: string
  VITE_TIKTOK_PIXEL_ID?: string
}

export interface TrackingConfig {
  gtagId?: string
  googleAdsId?: string
  googleAdsConversionLabel?: string
  gtmId?: string
  metaPixelId?: string
  tiktokPixelId?: string
}

export interface PurchaseItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface PurchaseTrackingPayload {
  transactionId: string
  amount: number
  currency?: string
  items?: PurchaseItem[]
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
    ttq?: {
      page: () => void
      track: (event: string, params?: Record<string, unknown>) => void
      grantConsent?: () => void
      revokeConsent?: () => void
      [key: string]: unknown
    }
  }
}

let initialized = false
let activeConfig: TrackingConfig | null = null
let lastDispatchedPath: string | null = null
let lastMetaDispatchedPath: string | null = null
let lastTiktokDispatchedPath: string | null = null

/**
 * Normaliza e higieniza variáveis de ambiente de tráfego pago e métricas.
 */
export function parseTrackingConfig(env: TrackingEnv = import.meta.env): TrackingConfig {
  const sanitize = (val?: string) => {
    if (!val) return undefined
    const trimmed = String(val).trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  return {
    gtagId: sanitize(env.VITE_GTAG_ID),
    googleAdsId: sanitize(env.VITE_GOOGLE_ADS_ID),
    googleAdsConversionLabel: sanitize(env.VITE_GOOGLE_ADS_CONVERSION_LABEL),
    gtmId: sanitize(env.VITE_GTM_ID),
    metaPixelId: sanitize(env.VITE_META_PIXEL_ID),
    tiktokPixelId: sanitize(env.VITE_TIKTOK_PIXEL_ID),
  }
}

export function isTrackingConfigured(config: TrackingConfig): boolean {
  return Boolean(
    config.gtagId ||
    config.googleAdsId ||
    config.gtmId ||
    config.metaPixelId ||
    config.tiktokPixelId,
  )
}

function injectScript(id: string, src: string): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null
  if (document.getElementById(id)) return null

  const script = document.createElement('script')
  script.id = id
  script.src = src
  script.async = true
  document.head.appendChild(script)
  return script
}

/**
 * Permite reconfigurar o tracking dinamicamente com dados da API pública (ex: /public/server/info/).
 */
export function reconfigureTrackingFromApi(info?: {
  gtag_id?: string
  google_ads_id?: string
  google_ads_conversion_label?: string
  gtm_id?: string
  meta_pixel_id?: string
  tiktok_pixel_id?: string
}): TrackingConfig | null {
  if (!info) return activeConfig
  const env: TrackingEnv = {
    VITE_GTAG_ID: info.gtag_id ?? import.meta.env.VITE_GTAG_ID,
    VITE_GOOGLE_ADS_ID: info.google_ads_id ?? import.meta.env.VITE_GOOGLE_ADS_ID,
    VITE_GOOGLE_ADS_CONVERSION_LABEL:
      info.google_ads_conversion_label ??
      import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL,
    VITE_GTM_ID: info.gtm_id ?? import.meta.env.VITE_GTM_ID,
    VITE_META_PIXEL_ID: info.meta_pixel_id ?? import.meta.env.VITE_META_PIXEL_ID,
    VITE_TIKTOK_PIXEL_ID: info.tiktok_pixel_id ?? import.meta.env.VITE_TIKTOK_PIXEL_ID,
  }
  return initTracking(env)
}

/**
 * Inicializa os provedores de tráfego pago configurados no .env ou via API respeitando o LGPD/Consent.
 */
export function initTracking(env: TrackingEnv = import.meta.env): TrackingConfig {
  const config = parseTrackingConfig(env)
  if (initialized && activeConfig) {
    const isSame =
      activeConfig.gtagId === config.gtagId &&
      activeConfig.googleAdsId === config.googleAdsId &&
      activeConfig.googleAdsConversionLabel === config.googleAdsConversionLabel &&
      activeConfig.gtmId === config.gtmId &&
      activeConfig.metaPixelId === config.metaPixelId &&
      activeConfig.tiktokPixelId === config.tiktokPixelId
    if (isSame) return activeConfig
  }

  const googleChanged = !initialized || activeConfig?.gtmId !== config.gtmId ||
    (!config.gtmId && (activeConfig?.gtagId !== config.gtagId || activeConfig?.googleAdsId !== config.googleAdsId))
  if (googleChanged) lastDispatchedPath = null
  if (typeof window !== 'undefined' && activeConfig?.gtagId && !config.gtmId &&
      activeConfig.gtagId !== config.gtagId) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${activeConfig.gtagId}`] = true
  }
  if (typeof document !== 'undefined' && activeConfig && googleChanged) {
    document.getElementById('pdl-gtag-script')?.remove()
    document.getElementById('pdl-gtm-script')?.remove()
  }
  if (typeof window !== 'undefined' && config.gtagId && !config.gtmId) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${config.gtagId}`] = false
  }
  activeConfig = config

  if (typeof window === 'undefined') return config
  if (!isTrackingConfigured(config)) {
    initialized = true
    return config
  }

  const allowAnalytics = hasAnalyticsConsent()
  const allowMarketing = hasMarketingConsent()

  // 1. Google Tag (gtag.js) / Google Ads
  const googlePrimaryId = config.gtmId ? undefined : config.gtagId || config.googleAdsId
  if (googleChanged && (googlePrimaryId || config.gtmId)) {
    window.dataLayer = window.dataLayer || []
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer?.push(args)
      }
    }

    // Google Consent Mode v2 padrão
    window.gtag('consent', 'default', {
      analytics_storage: allowAnalytics ? 'granted' : 'denied',
      ad_storage: allowMarketing ? 'granted' : 'denied',
      ad_user_data: allowMarketing ? 'granted' : 'denied',
      ad_personalization: allowMarketing ? 'granted' : 'denied',
    })

    if (googlePrimaryId) {
      injectScript('pdl-gtag-script', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googlePrimaryId)}`)

      window.gtag('js', new Date())
      if (config.gtagId) {
        window.gtag('config', config.gtagId, { send_page_view: false })
      }
      if (config.googleAdsId && config.googleAdsId !== config.gtagId) {
        window.gtag('config', config.googleAdsId)
      }
    }
  }

  // 2. Google Tag Manager (GTM)
  if (googleChanged && config.gtmId) {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
    injectScript('pdl-gtm-script', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`)
  }

  // 3. Meta Pixel (Facebook Pixel)
  if (config.metaPixelId) {
    if (!window.fbq) {
      const fbq: any = function (...args: unknown[]) {
        if (fbq.callMethod) {
          fbq.callMethod(...args)
        } else {
          fbq.queue.push(args)
        }
      }
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      fbq.queue = []
      window.fbq = fbq
      window._fbq = fbq
      injectScript('pdl-meta-pixel-script', 'https://connect.facebook.net/en_US/fbevents.js')
    }

    if (typeof window.fbq === 'function') {
      if (allowMarketing) {
        window.fbq('consent', 'grant')
      } else {
        window.fbq('consent', 'revoke')
      }
      window.fbq('init', config.metaPixelId)
    }
  }

  // 4. TikTok Pixel
  if (config.tiktokPixelId) {
    if (!window.ttq) {
      const ttq: any = []
      window.ttq = ttq
      ttq.methods = [
        'page',
        'track',
        'identify',
        'instances',
        'debug',
        'on',
        'off',
        'once',
        'ready',
        'alias',
        'group',
        'enableCookie',
        'disableCookie',
        'holdConsent',
        'revokeConsent',
        'grantConsent',
      ]
      ttq.setAndDefer = function (t: any, e: string) {
        t[e] = function (...args: unknown[]) {
          t.push([e, ...args])
        }
      }
      for (let i = 0; i < ttq.methods.length; i++) {
        ttq.setAndDefer(ttq, ttq.methods[i])
      }
      injectScript('pdl-tiktok-pixel-script', `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(config.tiktokPixelId)}&lib=ttq`)
    }

    if (typeof window.ttq?.grantConsent === 'function' && typeof window.ttq?.revokeConsent === 'function') {
      if (allowMarketing) {
        window.ttq.grantConsent()
      } else {
        window.ttq.revokeConsent()
      }
    }
    if (typeof (window.ttq as any)?.load === 'function') {
      ;(window.ttq as any).load(config.tiktokPixelId)
    }
  }

  initialized = true

  // Se o tracking foi configurado e a rota inicial ainda não teve page_view disparado, dispara agora
  if (typeof window !== 'undefined' && isTrackingConfigured(config)) {
    const currentPath = (window.location.pathname || '/') + (window.location.search || '')
    if (lastDispatchedPath !== currentPath) {
      trackPageView(currentPath, typeof document !== 'undefined' ? document.title : undefined)
    }
  }

  return config
}

/**
 * Atualiza o estado de consentimento dos pixels dinamicamente ao aceitar o cookie banner.
 */
export function updateTrackingConsent(consent: { analytics: boolean; marketing: boolean }) {
  if (typeof window === 'undefined') return

  const currentPath =
    lastDispatchedPath || (typeof window !== 'undefined' ? (window.location.pathname || '/') + (window.location.search || '') : null)

  // Google Consent Mode v2
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
    })
  }

  // Meta Pixel
  if (typeof window.fbq === 'function') {
    window.fbq('consent', consent.marketing ? 'grant' : 'revoke')
    if (
      consent.marketing &&
      activeConfig?.metaPixelId &&
      currentPath &&
      lastMetaDispatchedPath !== currentPath
    ) {
      window.fbq('track', 'PageView')
      lastMetaDispatchedPath = currentPath
      lastDispatchedPath = currentPath
    }
  }

  // TikTok Pixel
  if (typeof window.ttq === 'object' && window.ttq) {
    if (consent.marketing && typeof window.ttq.grantConsent === 'function') {
      window.ttq.grantConsent()
      if (
        typeof window.ttq.page === 'function' &&
        activeConfig?.tiktokPixelId &&
        currentPath &&
        lastTiktokDispatchedPath !== currentPath
      ) {
        window.ttq.page()
        lastTiktokDispatchedPath = currentPath
        lastDispatchedPath = currentPath
      }
    } else if (!consent.marketing && typeof window.ttq.revokeConsent === 'function') {
      window.ttq.revokeConsent()
    }
  }
}

/** Envia cada evento por um único transporte Google; GTM tem precedência. */
function dispatchGoogleEvent(name: string, params?: Record<string, unknown>) {
  if (activeConfig?.gtmId) {
    window.dataLayer?.push({ event: name, ...params })
  } else if ((activeConfig?.gtagId || activeConfig?.googleAdsId) && typeof window.gtag === 'function') {
    window.gtag('event', name, params)
  }
}

/**
 * Dispara visualização de página na SPA em todos os provedores habilitados e consentidos.
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return
  if (!activeConfig || !isTrackingConfigured(activeConfig)) return

  lastDispatchedPath = path
  const allowMarketing = hasMarketingConsent()

  dispatchGoogleEvent('page_view', {
    page_path: path,
    page_title: title || (typeof document !== 'undefined' ? document.title : ''),
  })

  // Meta Pixel
  if (allowMarketing && typeof window.fbq === 'function' && activeConfig?.metaPixelId) {
    window.fbq('track', 'PageView')
    lastMetaDispatchedPath = path
  }

  // TikTok Pixel
  if (allowMarketing && window.ttq && typeof window.ttq.page === 'function' && activeConfig?.tiktokPixelId) {
    window.ttq.page()
    lastTiktokDispatchedPath = path
  }
}

/**
 * Disparo customizado de evento para Google Tag Manager / Gtag / Meta.
 */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  dispatchGoogleEvent(name, params)

  if (hasMarketingConsent() && activeConfig?.metaPixelId && typeof window.fbq === 'function') {
    window.fbq('trackCustom', name, params)
  }

  if (hasMarketingConsent() && activeConfig?.tiktokPixelId && window.ttq && typeof window.ttq.track === 'function') {
    window.ttq.track(name, params)
  }
}

/**
 * Evento de Conversão: Cadastro de novo usuário concluído.
 */
export function trackRegistration(method = 'email') {
  if (typeof window === 'undefined') return

  dispatchGoogleEvent('sign_up', { method })

  if (hasMarketingConsent() && typeof window.fbq === 'function' && activeConfig?.metaPixelId) {
    window.fbq('track', 'CompleteRegistration', { content_name: method })
  }

  if (hasMarketingConsent() && window.ttq && typeof window.ttq.track === 'function' && activeConfig?.tiktokPixelId) {
    window.ttq.track('CompleteRegistration', { content_name: method })
  }
}

/**
 * Evento de Engajamento: Login realizado com sucesso.
 */
export function trackLogin(method = 'password') {
  if (typeof window === 'undefined') return

  dispatchGoogleEvent('login', { method })
}

/**
 * Evento de Conversão: Início do fluxo de pagamento (Checkout aberto).
 */
export function trackInitiateCheckout(amount: number, currency = 'BRL') {
  if (typeof window === 'undefined') return

  dispatchGoogleEvent('begin_checkout', { value: amount, currency })

  if (hasMarketingConsent() && typeof window.fbq === 'function' && activeConfig?.metaPixelId) {
    window.fbq('track', 'InitiateCheckout', { value: amount, currency })
  }

  if (hasMarketingConsent() && window.ttq && typeof window.ttq.track === 'function' && activeConfig?.tiktokPixelId) {
    window.ttq.track('InitiateCheckout', { value: amount, currency })
  }
}

/**
 * Evento de Conversão de Alto Valor: Compra/Recarga confirmada.
 */
export function trackPurchase(payload: PurchaseTrackingPayload) {
  if (typeof window === 'undefined') return
  const currency = payload.currency || 'BRL'

  dispatchGoogleEvent('purchase', {
    transaction_id: payload.transactionId,
    value: payload.amount,
    currency,
    items: payload.items,
  })
  if (!activeConfig?.gtmId && activeConfig?.googleAdsId && activeConfig.googleAdsConversionLabel && typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: `${activeConfig.googleAdsId}/${activeConfig.googleAdsConversionLabel}`,
      value: payload.amount,
      currency,
      transaction_id: payload.transactionId,
    })
  }

  // Meta Pixel (Purchase)
  if (hasMarketingConsent() && typeof window.fbq === 'function' && activeConfig?.metaPixelId) {
    window.fbq('track', 'Purchase', {
      value: payload.amount,
      currency,
      content_type: 'product',
      contents: payload.items?.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price,
      })),
    })
  }

  // TikTok Pixel (CompletePayment)
  if (hasMarketingConsent() && window.ttq && typeof window.ttq.track === 'function' && activeConfig?.tiktokPixelId) {
    window.ttq.track('CompletePayment', {
      value: payload.amount,
      currency,
    })
  }
}

/**
 * Para uso exclusivo em suítes de testes para resetar estado singleton.
 */
export function resetTrackingForTesting() {
  initialized = false
  activeConfig = null
  lastDispatchedPath = null
  lastMetaDispatchedPath = null
  lastTiktokDispatchedPath = null
}
