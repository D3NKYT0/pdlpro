// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import {
  COOKIE_POLICY_VERSION,
  COOKIE_STORAGE_KEY,
} from '../contexts/CookieConsentContext'
import {
  hasAnalyticsConsent,
  hasFunctionalConsent,
  readCookieConsent,
} from './cookieConsent'

afterEach(() => {
  localStorage.clear()
})

it('lê consentimento versionado do localStorage', () => {
  localStorage.setItem(
    COOKIE_STORAGE_KEY,
    JSON.stringify({
      preferences: { essential: true, functional: true, analytics: true, marketing: false },
      decidedAt: '2026-09-10T12:00:00.000Z',
      version: COOKIE_POLICY_VERSION,
    }),
  )
  expect(readCookieConsent()?.analytics).toBe(true)
  expect(hasAnalyticsConsent()).toBe(true)
  expect(hasFunctionalConsent()).toBe(true)
})

it('ignora consentimento de versão antiga', () => {
  localStorage.setItem(
    COOKIE_STORAGE_KEY,
    JSON.stringify({
      preferences: { essential: true, functional: true, analytics: true, marketing: true },
      decidedAt: '2026-01-01T00:00:00.000Z',
      version: '1999-01-01',
    }),
  )
  expect(readCookieConsent()).toBeNull()
  expect(hasAnalyticsConsent()).toBe(false)
})
