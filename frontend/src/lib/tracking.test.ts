// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  initTracking,
  isTrackingConfigured,
  parseTrackingConfig,
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

    vi.spyOn(cookieConsent, 'hasAnalyticsConsent').mockReturnValue(true)
    vi.spyOn(cookieConsent, 'hasMarketingConsent').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetTrackingForTesting()
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
  })
})
