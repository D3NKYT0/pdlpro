import type { BrowserOptions } from '@sentry/react'

type MonitoringEnvironment = {
  VITE_SENTRY_DSN?: string
  VITE_SENTRY_ENVIRONMENT?: string
  VITE_SENTRY_RELEASE?: string
  VITE_SENTRY_TRACES_SAMPLE_RATE?: string
}

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

export async function initializeMonitoring(environment: MonitoringEnvironment) {
  const options = buildMonitoringOptions(environment)
  if (!options) return {}
  try {
    const Sentry = await import('@sentry/react')
    Sentry.init(options)
    return {
      onUncaughtError: Sentry.reactErrorHandler(),
      onRecoverableError: Sentry.reactErrorHandler(),
    }
  } catch {
    return {}
  }
}
