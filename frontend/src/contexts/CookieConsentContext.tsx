import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export const COOKIE_STORAGE_KEY = 'PDL_cookie_consent'
/** Alinhar ao pacote legal vigente quando a política de cookies mudar. */
export const COOKIE_POLICY_VERSION = '2026-09-10'

export type CookieCategory = 'essential' | 'functional' | 'analytics' | 'marketing'

export interface CookieConsent {
  essential: true
  functional: boolean
  analytics: boolean
  marketing: boolean
}

interface StoredConsent {
  preferences: CookieConsent
  decidedAt: string
  version: string
}

interface CookieConsentContextValue {
  consent: CookieConsent | null
  hasDecided: boolean
  decidedAt: string | null
  version: string | null
  acceptAll: () => void
  rejectOptional: () => void
  savePreferences: (prefs: Omit<CookieConsent, 'essential'>) => void
  reset: () => void
  openSettings: () => void
  closeSettings: () => void
  isSettingsOpen: boolean
}

const DEFAULT_CONSENT: CookieConsent = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
}

const FULL_CONSENT: CookieConsent = {
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
}

function readStored(): StoredConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(COOKIE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConsent
    if (!parsed?.preferences || !parsed.decidedAt) return null
    if (parsed.version !== COOKIE_POLICY_VERSION) return null
    return {
      preferences: { ...DEFAULT_CONSENT, ...parsed.preferences, essential: true },
      decidedAt: parsed.decidedAt,
      version: parsed.version,
    }
  } catch {
    return null
  }
}

function persist(consent: CookieConsent): StoredConsent {
  const data: StoredConsent = {
    preferences: { ...consent, essential: true },
    decidedAt: new Date().toISOString(),
    version: COOKIE_POLICY_VERSION,
  }
  try {
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* private mode */
  }
  return data
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredConsent | null>(() => readStored())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_STORAGE_KEY) setStored(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const write = useCallback((consent: CookieConsent) => {
    setStored(persist(consent))
    setIsSettingsOpen(false)
  }, [])

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent: stored?.preferences ?? null,
      hasDecided: Boolean(stored),
      decidedAt: stored?.decidedAt ?? null,
      version: stored?.version ?? null,
      acceptAll: () => write(FULL_CONSENT),
      rejectOptional: () => write(DEFAULT_CONSENT),
      savePreferences: (prefs) => write({ ...prefs, essential: true }),
      reset: () => {
        try {
          localStorage.removeItem(COOKIE_STORAGE_KEY)
        } catch {
          /* ignore */
        }
        setStored(null)
        setIsSettingsOpen(true)
      },
      openSettings: () => setIsSettingsOpen(true),
      closeSettings: () => setIsSettingsOpen(false),
      isSettingsOpen,
    }),
    [stored, isSettingsOpen, write],
  )

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider')
  return ctx
}

export function useOptionalCookieConsent() {
  return useContext(CookieConsentContext)
}
