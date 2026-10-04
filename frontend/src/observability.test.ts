// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COOKIE_POLICY_VERSION, COOKIE_STORAGE_KEY } from './contexts/CookieConsentContext'
import { buildMonitoringOptions, initializeMonitoring } from './observability'

const sdk = vi.hoisted(() => ({ init: vi.fn(), reactErrorHandler: vi.fn(), wait: undefined as Promise<void> | undefined }))
vi.mock('@sentry/react', async () => { await sdk.wait; return { init: sdk.init, reactErrorHandler: sdk.reactErrorHandler } })
afterEach(() => { localStorage.clear(); vi.unstubAllEnvs(); vi.clearAllMocks(); sdk.wait = undefined })

describe('browser error monitoring', () => {
  it('stays disabled without a DSN', () => {
    expect(buildMonitoringOptions({})).toBeNull()
  })

  it('does not load a monitoring provider without a DSN', async () => {
    await expect(initializeMonitoring({})).resolves.toEqual({})
  })

  it('uses privacy-safe defaults', () => {
    expect(buildMonitoringOptions({ VITE_SENTRY_DSN: 'https://public@example.test/1' })).toMatchObject({
      dsn: 'https://public@example.test/1',
      environment: 'production',
      sendDefaultPii: false,
      tracesSampleRate: 0.05,
    })
  })

  it.each(['invalid', '-1', '1.1'])('replaces an invalid trace sample rate: %s', (rate) => {
    expect(buildMonitoringOptions({
      VITE_SENTRY_DSN: 'https://public@example.test/1',
      VITE_SENTRY_TRACES_SAMPLE_RATE: rate,
    })?.tracesSampleRate).toBe(0.05)
  })
  it('does not initialize the SDK when permission is revoked during import', async () => {
    vi.stubEnv('MODE', 'production')
    const setPermission = (analytics: boolean) => localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify({ version: COOKIE_POLICY_VERSION, decidedAt: '2026-10-03T00:00:00Z', preferences: { essential: true, functional: false, analytics, marketing: false } }))
    setPermission(true)
    let finish!: () => void
    sdk.wait = new Promise(resolve => { finish = resolve })
    const pending = initializeMonitoring({ VITE_SENTRY_DSN: 'https://public@example.test/1' })
    setPermission(false)
    finish()
    await expect(pending).resolves.toEqual({})
    expect(sdk.init).not.toHaveBeenCalled()
  })

})
