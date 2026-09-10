import {
  COOKIE_POLICY_VERSION,
  COOKIE_STORAGE_KEY,
  type CookieConsent,
} from '../contexts/CookieConsentContext'

type StoredConsent = {
  preferences: CookieConsent
  decidedAt: string
  version: string
}

/** Lê o consentimento atual sem depender do React (útil em bootstrap). */
export function readCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(COOKIE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConsent
    if (!parsed?.preferences || parsed.version !== COOKIE_POLICY_VERSION) return null
    return {
      essential: true,
      functional: Boolean(parsed.preferences.functional),
      analytics: Boolean(parsed.preferences.analytics),
      marketing: Boolean(parsed.preferences.marketing),
    }
  } catch {
    return null
  }
}

export function hasAnalyticsConsent(consent?: CookieConsent | null): boolean {
  const current = consent ?? readCookieConsent()
  return Boolean(current?.analytics)
}

export function hasFunctionalConsent(consent?: CookieConsent | null): boolean {
  const current = consent ?? readCookieConsent()
  return Boolean(current?.functional)
}

export function hasMarketingConsent(consent?: CookieConsent | null): boolean {
  const current = consent ?? readCookieConsent()
  return Boolean(current?.marketing)
}
