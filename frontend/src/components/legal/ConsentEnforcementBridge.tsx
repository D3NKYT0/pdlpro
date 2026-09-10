import { useEffect, useRef } from 'react'
import { useCookieConsent } from '../../contexts/CookieConsentContext'
import { hasAnalyticsConsent, hasFunctionalConsent } from '../../lib/cookieConsent'
import { LANGUAGE_STORAGE_KEY } from '../../i18n/locale'
import { initializeMonitoring, shutdownMonitoring } from '../../observability'

/**
 * Aplica efeitos reais do consentimento:
 * - analytics → Sentry/monitoramento
 * - functional → persiste idioma (localStorage + cookie django_language)
 */
export function ConsentEnforcementBridge() {
  const { consent, hasDecided } = useCookieConsent()
  const monitoringStarted = useRef(false)

  useEffect(() => {
    if (!hasDecided) return

    const allowAnalytics = hasAnalyticsConsent(consent)
    if (allowAnalytics && !monitoringStarted.current) {
      void initializeMonitoring(import.meta.env).then(() => {
        monitoringStarted.current = true
      })
    }
    if (!allowAnalytics && monitoringStarted.current) {
      void shutdownMonitoring()
      monitoringStarted.current = false
    }

    if (!hasFunctionalConsent(consent)) {
      try {
        localStorage.removeItem(LANGUAGE_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      if (typeof document !== 'undefined') {
        document.cookie = 'django_language=; path=/; max-age=0; SameSite=Lax'
      }
    }
  }, [consent, hasDecided])

  return null
}
