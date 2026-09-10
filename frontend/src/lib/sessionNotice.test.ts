// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  announceSessionExpired,
  clearSessionMarkers,
  consumeSessionExpiredNotice,
  hasRememberedSession,
  markSessionExpired,
  rememberAuthenticatedSession,
  SESSION_EXPIRED_EVENT,
} from './sessionNotice'

beforeEach(() => {
  sessionStorage.clear()
})
afterEach(() => {
  sessionStorage.clear()
})

it('lembra sessão autenticada e limpa marcadores no logout', () => {
  rememberAuthenticatedSession()
  expect(hasRememberedSession()).toBe(true)
  clearSessionMarkers()
  expect(hasRememberedSession()).toBe(false)
  expect(consumeSessionExpiredNotice()).toBe(false)
})

it('marca expiração só quando havia sessão lembrada', () => {
  expect(markSessionExpired()).toBe(false)
  expect(consumeSessionExpiredNotice()).toBe(false)

  rememberAuthenticatedSession()
  expect(markSessionExpired()).toBe(true)
  expect(hasRememberedSession()).toBe(false)
  expect(consumeSessionExpiredNotice()).toBe(true)
  expect(consumeSessionExpiredNotice()).toBe(false)
})

it('anuncia expiração via evento de janela', () => {
  const listener = vi.fn()
  window.addEventListener(SESSION_EXPIRED_EVENT, listener)
  announceSessionExpired()
  expect(listener).toHaveBeenCalledTimes(1)
  window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
})
