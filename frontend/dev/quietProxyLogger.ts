import type { Plugin } from 'vite'

export const BACKEND_UNAVAILABLE_MESSAGE =
  'Backend indisponível no destino do proxy. Suba o Django (porta 8000 no desenvolvimento nativo) para as APIs; recusas repetidas não serão exibidas neste terminal.'

export function isBackendProxyRefusal(message: string, error?: unknown): boolean {
  const isProxyLog =
    message.includes('http proxy error') || message.includes('ws proxy error')
  if (!isProxyLog) {
    return false
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNREFUSED') {
    return true
  }
  return message.includes('ECONNREFUSED')
}

export function createProxyRefusalGate(options?: {
  recoverAfterMs?: number
  now?: () => number
}) {
  const recoverAfterMs = options?.recoverAfterMs ?? 30_000
  const now = options?.now ?? Date.now
  let silentUntil = 0

  return {
    shouldAnnounce(): boolean {
      const at = now()
      if (at < silentUntil) {
        return false
      }
      silentUntil = at + recoverAfterMs
      return true
    },
  }
}

export function quietBackendProxyPlugin(): Plugin {
  const gate = createProxyRefusalGate()
  return {
    name: 'quiet-backend-proxy',
    apply: 'serve',
    configureServer(server) {
      const { logger } = server.config
      const originalError = logger.error.bind(logger)
      logger.error = (msg, options) => {
        if (isBackendProxyRefusal(String(msg), options?.error)) {
          if (gate.shouldAnnounce()) {
            logger.warn(BACKEND_UNAVAILABLE_MESSAGE)
          }
          return
        }
        originalError(msg, options)
      }
    },
  }
}
