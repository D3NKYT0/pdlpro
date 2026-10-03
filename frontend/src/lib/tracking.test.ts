// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  initTracking,
  isTrackingConfigured,
  parseTrackingConfig,
  reconfigureTrackingFromApi,
  resetTrackingForTesting,
  trackEvent,
  trackInitiateCheckout,
  trackLogin,
  trackPageView,
  trackPurchase,
  trackRegistration,
  updateTrackingConsent,
} from './tracking'
import * as cookieConsent from './cookieConsent'

describe('Paid Traffic & Analytics tracking', () => {
  beforeEach(() => {
    resetTrackingForTesting()
    document.head.innerHTML = ''
    delete (window as any).dataLayer
    delete (window as any).gtag
    delete (window as any).fbq
    delete (window as any)._fbq
    delete (window as any).ttq
    for (const key of Object.keys(window)) {
      if (key.startsWith('ga-disable-')) delete (window as unknown as Record<string, unknown>)[key]
    }

    vi.spyOn(cookieConsent, 'hasAnalyticsConsent').mockReturnValue(true)
    vi.spyOn(cookieConsent, 'hasMarketingConsent').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    resetTrackingForTesting()
    for (const key of Object.keys(window)) {
      if (key.startsWith('ga-disable-')) delete (window as unknown as Record<string, unknown>)[key]
    }
  })

  describe('parseTrackingConfig', () => {
    it('returns empty config when no variables are defined', () => {
      const config = parseTrackingConfig({})
      expect(config.gtagId).toBeUndefined()
      expect(config.googleAdsId).toBeUndefined()
      expect(config.gtmId).toBeUndefined()
      expect(config.metaPixelId).toBeUndefined()
      expect(config.tiktokPixelId).toBeUndefined()
      expect(isTrackingConfigured(config)).toBe(false)
    })

    it('sanitizes and trims env variable inputs', () => {
      const config = parseTrackingConfig({
        VITE_GTAG_ID: '  G-12345678  ',
        VITE_GOOGLE_ADS_ID: ' AW-99999 ',
        VITE_GOOGLE_ADS_CONVERSION_LABEL: ' label_xyz ',
        VITE_GTM_ID: ' GTM-ABCDEF ',
        VITE_META_PIXEL_ID: ' 1234567890 ',
        VITE_TIKTOK_PIXEL_ID: ' C1234567 ',
      })

      expect(config).toEqual({
        gtagId: 'G-12345678',
        googleAdsId: 'AW-99999',
        googleAdsConversionLabel: 'label_xyz',
        gtmId: 'GTM-ABCDEF',
        metaPixelId: '1234567890',
        tiktokPixelId: 'C1234567',
      })
      expect(isTrackingConfigured(config)).toBe(true)
    })
  })

  describe('initTracking', () => {
    it('does not inject scripts when no IDs are configured', () => {
      initTracking({})
      expect(document.querySelectorAll('script')).toHaveLength(0)
      expect(window.gtag).toBeUndefined()
      expect(window.fbq).toBeUndefined()
    })

    it('initializes Google Tag (gtag.js) and Consent Mode v2', () => {
      initTracking({
        VITE_GTAG_ID: 'G-TEST1234',
        VITE_GOOGLE_ADS_ID: 'AW-55555',
      })

      const script = document.getElementById('pdl-gtag-script') as HTMLScriptElement
      expect(script).not.toBeNull()
      expect(script.src).toContain('googletagmanager.com/gtag/js?id=G-TEST1234')
      expect(typeof window.gtag).toBe('function')
      expect(Array.isArray(window.dataLayer)).toBe(true)

      // Verifica se o gtag foi chamado com consent e configs
      const calls = (window.dataLayer as any[])
      expect(calls.some(args => args[0] === 'consent' && args[1] === 'default')).toBe(true)
      expect(calls.some(args => args[0] === 'config' && args[1] === 'G-TEST1234')).toBe(true)
      expect(calls.some(args => args[0] === 'config' && args[1] === 'AW-55555')).toBe(true)
    })

    it('initializes Google Tag Manager (GTM)', () => {
      initTracking({
        VITE_GTM_ID: 'GTM-TEST999',
      })

      const script = document.getElementById('pdl-gtm-script') as HTMLScriptElement
      expect(script).not.toBeNull()
      expect(script.src).toContain('googletagmanager.com/gtm.js?id=GTM-TEST999')
      expect((window.dataLayer as any[])?.some(item => item.event === 'gtm.js')).toBe(true)
    })

    it('initializes Meta Pixel with fbevents loader', () => {
      initTracking({
        VITE_META_PIXEL_ID: '987654321',
      })

      const script = document.getElementById('pdl-meta-pixel-script') as HTMLScriptElement
      expect(script).not.toBeNull()
      expect(script.src).toContain('connect.facebook.net/en_US/fbevents.js')
      expect(typeof window.fbq).toBe('function')
    })

    it('is idempotent and avoids injecting duplicate scripts', () => {
      initTracking({ VITE_GTAG_ID: 'G-TEST1234' })
      initTracking({ VITE_GTAG_ID: 'G-TEST1234' })
      expect(document.querySelectorAll('#pdl-gtag-script')).toHaveLength(1)
    })
  })

  describe('updateTrackingConsent', () => {
    it('updates Google Consent Mode and Meta Pixel consent', () => {
      const gtagSpy = vi.fn()
      const fbqSpy = vi.fn()
      window.gtag = gtagSpy
      window.fbq = fbqSpy

      updateTrackingConsent({ analytics: true, marketing: false })

      expect(gtagSpy).toHaveBeenCalledWith('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
      expect(fbqSpy).toHaveBeenCalledWith('consent', 'revoke')

      updateTrackingConsent({ analytics: true, marketing: true })
      expect(fbqSpy).toHaveBeenCalledWith('consent', 'grant')
    })

    it('retroactively dispatches PageView to Meta and TikTok when marketing consent is granted without duplicating', () => {
      vi.spyOn(cookieConsent, 'hasMarketingConsent').mockReturnValue(false)

      initTracking({
        VITE_META_PIXEL_ID: 'META-12345',
        VITE_TIKTOK_PIXEL_ID: 'TT-12345',
      })

      const fbqSpy = vi.fn()
      window.fbq = fbqSpy
      const ttqPageSpy = vi.fn()
      window.ttq = { page: ttqPageSpy, track: vi.fn(), grantConsent: vi.fn(), revokeConsent: vi.fn() }

      updateTrackingConsent({ analytics: true, marketing: true })

      expect(fbqSpy).toHaveBeenCalledWith('track', 'PageView')
      expect(ttqPageSpy).toHaveBeenCalled()

      // Segunda chamada com o mesmo consentimento não deve reenviar PageView duplicado
      fbqSpy.mockClear()
      ttqPageSpy.mockClear()
      updateTrackingConsent({ analytics: true, marketing: true })

      expect(fbqSpy).not.toHaveBeenCalledWith('track', 'PageView')
      expect(ttqPageSpy).not.toHaveBeenCalled()
    })
  })

  describe('reconfigureTrackingFromApi', () => {
    it('honors an explicit empty API field instead of resurrecting build-time IDs', () => {
      vi.stubEnv('VITE_GTAG_ID', 'G-BUILD')
      vi.stubEnv('VITE_GTM_ID', 'GTM-BUILD')
      const config = reconfigureTrackingFromApi({ gtag_id: '', gtm_id: '' })
      expect(config?.gtagId).toBeUndefined()
      expect(config?.gtmId).toBeUndefined()
      expect(document.querySelectorAll('script')).toHaveLength(0)
    })

    it('uses only GTM when the API overrides a direct build-time GA4 installation', () => {
      vi.stubEnv('VITE_GTAG_ID', 'G-BUILD')
      reconfigureTrackingFromApi({ gtag_id: '', gtm_id: 'GTM-PANEL' })
      expect(document.getElementById('pdl-gtag-script')).toBeNull()
      expect(document.getElementById('pdl-gtm-script')).not.toBeNull()
    })
    it('dynamically reconfigures tracking when IDs arrive via reconfigureTrackingFromApi', () => {
      initTracking({})
      expect(document.getElementById('pdl-gtag-script')).toBeNull()

      reconfigureTrackingFromApi({
        gtag_id: 'G-DYNAMIC999',
        meta_pixel_id: '9876543210',
      })

      const script = document.getElementById('pdl-gtag-script') as HTMLScriptElement
      expect(script).not.toBeNull()
      expect(script.src).toContain('googletagmanager.com/gtag/js?id=G-DYNAMIC999')
      expect(typeof window.fbq).toBe('function')
    })

    it('dispatches pageview for the active page when tracking is dynamically reconfigured', () => {
      initTracking({})
      const calls = (window.dataLayer as any[]) || []
      expect(calls.some((item) => item[0] === 'event' && item[1] === 'page_view')).toBe(false)

      reconfigureTrackingFromApi({
        gtag_id: 'G-DYNAMIC-PAGEVIEW',
      })

      const updatedCalls = (window.dataLayer as any[]) || []
      expect(
        updatedCalls.some(
          (item) => item[0] === 'event' && item[1] === 'page_view' && item[2]?.page_path === window.location.pathname,
        ),
      ).toBe(true)
    })
  })

  it('routes Google events once through GTM even when GA4 and Ads IDs are also present', () => {
    initTracking({ VITE_GTAG_ID: 'G-DIRECT', VITE_GTM_ID: 'GTM-PANEL', VITE_GOOGLE_ADS_ID: 'AW-DIRECT' })
    expect(document.getElementById('pdl-gtag-script')).toBeNull()
    window.gtag = vi.fn()
    window.dataLayer = []
    trackPageView('/unique')
    trackLogin('password')
    trackRegistration('email')
    trackInitiateCheckout(10)
    trackPurchase({ transactionId: 'unique', amount: 10 })
    trackEvent('custom')
    expect(window.gtag).not.toHaveBeenCalled()
    expect(window.dataLayer).toHaveLength(6)
    expect((window.dataLayer as any[]).map(item => item.event)).toEqual(['page_view', 'login', 'sign_up', 'begin_checkout', 'purchase', 'custom'])
  })

  it('does not restart GTM when an unrelated pixel setting changes', () => {
    initTracking({ VITE_GTM_ID: 'GTM-PANEL' })
    initTracking({ VITE_GTM_ID: 'GTM-PANEL', VITE_META_PIXEL_ID: 'NEW-PIXEL' })
    expect((window.dataLayer as any[]).filter(item => item.event === 'gtm.js')).toHaveLength(1)
    expect((window.dataLayer as any[]).filter(item => item.event === 'page_view')).toHaveLength(1)
  })

  it('does not reload the container when inactive direct Google IDs change', () => {
    initTracking({ VITE_GTM_ID: 'GTM-PANEL', VITE_GTAG_ID: 'G-OLD' })
    const loader = document.getElementById('pdl-gtm-script')
    initTracking({ VITE_GTM_ID: 'GTM-PANEL', VITE_GTAG_ID: 'G-NEW', VITE_GOOGLE_ADS_ID: 'AW-NEW' })
    expect(document.getElementById('pdl-gtm-script')).toBe(loader)
    expect((window.dataLayer as any[]).filter(item => item.event === 'gtm.js')).toHaveLength(1)
    expect(document.getElementById('pdl-gtag-script')).toBeNull()
  })

  it('replaces the direct loader and stops sending to an explicitly cleared destination', () => {
    initTracking({ VITE_GTAG_ID: 'G-OLD' })
    reconfigureTrackingFromApi({ gtag_id: '' })
    window.gtag = vi.fn()
    trackLogin()
    trackPageView('/disabled')
    expect(window.gtag).not.toHaveBeenCalled()
    expect(document.getElementById('pdl-gtag-script')).toBeNull()
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-OLD']).toBe(true)
    reconfigureTrackingFromApi({ gtag_id: 'G-NEW' })
    expect((document.getElementById('pdl-gtag-script') as HTMLScriptElement).src).toContain('G-NEW')
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-NEW']).toBe(false)
  })

  describe('event dispatchers', () => {
    beforeEach(() => {
      initTracking({
        VITE_GTAG_ID: 'G-TEST',
        VITE_GOOGLE_ADS_ID: 'AW-ADS',
        VITE_GOOGLE_ADS_CONVERSION_LABEL: 'conv_label_123',
        VITE_META_PIXEL_ID: 'META-123',
        VITE_TIKTOK_PIXEL_ID: 'TT-123',
      })

      window.gtag = vi.fn()
      window.fbq = vi.fn()
      window.ttq = {
        page: vi.fn(),
        track: vi.fn(),
      }
    })

    it('dispatches pageview to all active providers when consented', () => {
      trackPageView('/panel/wallet', 'Minha Carteira')

      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/panel/wallet',
        page_title: 'Minha Carteira',
      })
      expect(
        (window.dataLayer as any[])?.some(
          (item) => item.event === 'page_view' && item.page_path === '/panel/wallet',
        ),
      ).toBe(false)
      expect(window.fbq).toHaveBeenCalledWith('track', 'PageView')
      expect(window.ttq?.page).toHaveBeenCalled()
    })

    it('dispatches registration conversion event', () => {
      trackRegistration('email')

      expect(window.gtag).toHaveBeenCalledWith('event', 'sign_up', { method: 'email' })
      expect(window.fbq).toHaveBeenCalledWith('track', 'CompleteRegistration', { content_name: 'email' })
      expect(window.ttq?.track).toHaveBeenCalledWith('CompleteRegistration', { content_name: 'email' })
    })

    it('dispatches login event to analytics', () => {
      trackLogin('password')
      expect(window.gtag).toHaveBeenCalledWith('event', 'login', { method: 'password' })
    })

    it('dispatches checkout initiation event', () => {
      trackInitiateCheckout(50, 'BRL')

      expect(window.gtag).toHaveBeenCalledWith('event', 'begin_checkout', { value: 50, currency: 'BRL' })
      expect(window.fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', { value: 50, currency: 'BRL' })
      expect(window.ttq?.track).toHaveBeenCalledWith('InitiateCheckout', { value: 50, currency: 'BRL' })
    })

    it('dispatches purchase conversion event including Google Ads label', () => {
      trackPurchase({
        transactionId: 'tx-123',
        amount: 100,
        currency: 'BRL',
        items: [{ id: 'pkg-1', name: 'Pacote 1000 Coins', price: 100, quantity: 1 }],
      })

      // GA4 Purchase
      expect(window.gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({
        transaction_id: 'tx-123',
        value: 100,
        currency: 'BRL',
      }))

      // Google Ads Conversion
      expect(window.gtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-ADS/conv_label_123',
        value: 100,
        currency: 'BRL',
        transaction_id: 'tx-123',
      })

      // Meta Purchase
      expect(window.fbq).toHaveBeenCalledWith('track', 'Purchase', expect.objectContaining({
        value: 100,
        currency: 'BRL',
      }))

      // TikTok Payment
      expect(window.ttq?.track).toHaveBeenCalledWith('CompletePayment', {
        value: 100,
        currency: 'BRL',
      })
    })

    it('dispatches custom event via trackEvent', () => {
      trackEvent('custom_quest_claim', { quest_id: 'q10' })

      expect(window.gtag).toHaveBeenCalledWith('event', 'custom_quest_claim', { quest_id: 'q10' })
      expect(window.fbq).toHaveBeenCalledWith('trackCustom', 'custom_quest_claim', { quest_id: 'q10' })
      expect(window.ttq?.track).toHaveBeenCalledWith('custom_quest_claim', { quest_id: 'q10' })
    })

    it('respects revoked consent and blocks marketing pixels', () => {
      vi.spyOn(cookieConsent, 'hasMarketingConsent').mockReturnValue(false)
      vi.spyOn(cookieConsent, 'hasAnalyticsConsent').mockReturnValue(true)

      trackPageView('/home')

      expect(window.gtag).toHaveBeenCalled()
      expect(window.fbq).not.toHaveBeenCalled()
      expect(window.ttq?.page).not.toHaveBeenCalled()
    })

    it('dispatches pageview to Google Tag in Consent Mode v2 even before analytics consent is granted', () => {
      vi.spyOn(cookieConsent, 'hasAnalyticsConsent').mockReturnValue(false)

      trackPageView('/home')

      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/home',
        page_title: '',
      })
    })
  })
})
