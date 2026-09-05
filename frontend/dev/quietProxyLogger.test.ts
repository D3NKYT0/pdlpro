import { expect, it } from 'vitest'
import {
  BACKEND_UNAVAILABLE_MESSAGE,
  createProxyRefusalGate,
  isBackendProxyRefusal,
  quietBackendProxyPlugin,
} from './quietProxyLogger'

it('reconhece recusa HTTP do proxy quando o backend não aceita conexão', () => {
  expect(
    isBackendProxyRefusal('http proxy error: /api/v1/shared/me/', { code: 'ECONNREFUSED' }),
  ).toBe(true)
})

it('reconhece recusa WebSocket do proxy pelo código ou pelo texto', () => {
  expect(isBackendProxyRefusal('ws proxy error:\nError: connect ECONNREFUSED')).toBe(true)
  expect(isBackendProxyRefusal('\u001B[31mws proxy error:\u001B[39m', { code: 'ECONNREFUSED' })).toBe(
    true,
  )
})

it('mantém outros erros de proxy e logs comuns visíveis', () => {
  expect(isBackendProxyRefusal('http proxy error: /api/v1/shared/me/', { code: 'ECONNRESET' })).toBe(
    false,
  )
  expect(isBackendProxyRefusal('Failed to resolve import', { code: 'ECONNREFUSED' })).toBe(false)
})

it('anuncia a primeira recusa e silencia as seguintes até o backend voltar', () => {
  let now = 1_000
  const gate = createProxyRefusalGate({ recoverAfterMs: 30_000, now: () => now })

  expect(gate.shouldAnnounce()).toBe(true)
  expect(gate.shouldAnnounce()).toBe(false)
  now = 30_999
  expect(gate.shouldAnnounce()).toBe(false)
  now = 31_000
  expect(gate.shouldAnnounce()).toBe(true)
})

it('o plugin de desenvolvimento intercepta o logger do servidor Vite', () => {
  const plugin = quietBackendProxyPlugin()
  const error = { ...new Error('connect ECONNREFUSED'), code: 'ECONNREFUSED' }
  const originalError = () => {
    throw new Error('não deveria registrar recusa repetida')
  }
  const warnings: string[] = []
  const logger = {
    error: originalError,
    warn(message: string) {
      warnings.push(message)
    },
  }

  const configureServer = plugin.configureServer
  if (typeof configureServer !== 'function') {
    throw new Error('plugin sem configureServer')
  }
  configureServer({ config: { logger } } as never)
  logger.error('http proxy error: /api/v1/public/theme/', { error })
  logger.error('http proxy error: /api/v1/shared/me/', { error })

  expect(warnings).toEqual([BACKEND_UNAVAILABLE_MESSAGE])
})
