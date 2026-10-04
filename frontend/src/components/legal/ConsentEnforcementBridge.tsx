import { useEffect, useRef } from 'react'
import { useCookieConsent } from '../../contexts/CookieConsentContext'
import { hasAnalyticsConsent, hasFunctionalConsent, hasMarketingConsent } from '../../lib/cookieConsent'
import { LANGUAGE_STORAGE_KEY } from '../../i18n/locale'
import { initializeMonitoring, shutdownMonitoring } from '../../observability'
import { updateTrackingConsent } from '../../lib/tracking'

/**
 * Aplica efeitos reais do consentimento:
 * - analytics → Sentry/monitoramento e Google Analytics (gtag)
 * - marketing → Meta Pixel, Google Ads, TikTok Pixel
 * - functional → persiste idioma (localStorage + cookie django_language)
 */
export function ConsentEnforcementBridge() {
  const { consent, hasDecided } = useCookieConsent()
  const monitoringStarted = useRef(false)

  useEffect(() => {
    const allowAnalytics = hasDecided && hasAnalyticsConsent(consent)
    const allowMarketing = hasDecided && hasMarketingConsent(consent)

    updateTrackingConsent({
      analytics: allowAnalytics,
      marketing: allowMarketing,
    })

    let cancelled = false
    if (allowAnalytics && !monitoringStarted.current) {
      void initializeMonitoring(import.meta.env).then(() => {
        if (cancelled && !hasAnalyticsConsent()) {
          void shutdownMonitoring()
        } else {
          monitoringStarted.current = true
        }
      })
    }
    if (!allowAnalytics && monitoringStarted.current) {
      void shutdownMonitoring()
      monitoringStarted.current = false
    }

    if (!hasDecided || !hasFunctionalConsent(consent)) {
      try {
        localStorage.removeItem(LANGUAGE_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      if (typeof document !== 'undefined') {
        document.cookie = 'django_language=; path=/; max-age=0; SameSite=Lax'
      }
    }
    return () => { cancelled = true }
  }, [consent, hasDecided])

  return null
}
