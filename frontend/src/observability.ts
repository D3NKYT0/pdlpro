import type { BrowserOptions } from '@sentry/react'
import { hasAnalyticsConsent } from './lib/cookieConsent'

type MonitoringEnvironment = {
  VITE_SENTRY_DSN?: string
  VITE_SENTRY_ENVIRONMENT?: string
  VITE_SENTRY_RELEASE?: string
  VITE_SENTRY_TRACES_SAMPLE_RATE?: string
}

let sentryActive = false

export function buildMonitoringOptions(environment: MonitoringEnvironment): BrowserOptions | null {
  const dsn = environment.VITE_SENTRY_DSN?.trim()
  if (!dsn) return null

  const configuredRate = Number(environment.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.05')
  const tracesSampleRate = Number.isFinite(configuredRate) && configuredRate >= 0 && configuredRate <= 1
    ? configuredRate
    : 0.05

  return {
    dsn,
    environment: environment.VITE_SENTRY_ENVIRONMENT || 'production',
    release: environment.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate,
  }
}

/** Inicializa Sentry apenas com consentimento analítico (ou em testes sem banner). */
export async function initializeMonitoring(environment: MonitoringEnvironment) {
  if (!hasAnalyticsConsent() && import.meta.env.MODE !== 'test') {
    return {}
  }
  const options = buildMonitoringOptions(environment)
  if (!options) return {}
  try {
    const Sentry = await import('@sentry/react')
    Sentry.init(options)
    sentryActive = true
    return {
      onUncaughtError: Sentry.reactErrorHandler(),
      onRecoverableError: Sentry.reactErrorHandler(),
    }
  } catch {
    return {}
  }
}

/** Encerra o cliente Sentry quando o usuário revoga analytics. */
export async function shutdownMonitoring() {
  if (!sentryActive) return
  try {
    const Sentry = await import('@sentry/react')
    await Sentry.close(2000)
  } catch {
    /* ignore */
  } finally {
    sentryActive = false
  }
}
