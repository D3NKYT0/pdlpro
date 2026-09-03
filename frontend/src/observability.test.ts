import { describe, expect, it } from 'vitest'
import { buildMonitoringOptions, initializeMonitoring } from './observability'

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
})
