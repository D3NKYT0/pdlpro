// @vitest-environment jsdom
/** Exercita a composição real de providers, restauração da sessão e navegação. */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiError, request } from './services/infra/http'
import { queryClient } from './services/infra/queryClient'
import App from './App'

vi.mock('./services/infra/http', async original => ({ ...await original<object>(), request: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(() => { cleanup(); queryClient.clear(); vi.restoreAllMocks() })
it('visitante abre rota privada e recebe login com destino preservado', async () => {
  vi.mocked(request).mockImplementation(path => {
    if (path === '/shared/me/') return Promise.reject(new ApiError('Sem sessão', 401, 'UNAUTHORIZED'))
    return new Promise(() => {})
  })
  window.history.replaceState({}, '', '/painel/shop')
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Entre no Reino' })).toBeVisible()
  await waitFor(() => expect(window.location.pathname).toBe('/login'))
  expect(new URLSearchParams(window.location.search).get('next')).toBe('/painel/shop')
})
it('sessão restaurada abre painel com dados do usuário', async () => {
  vi.mocked(request).mockImplementation(path => {
    if (path === '/shared/me/') return Promise.resolve({ id: 'user', username: 'Tester', display_name: 'Tester', email: 'user@test.dev', is_staff: false, is_email_verified: true }) as ReturnType<typeof request>
    return new Promise(() => {})
  })
  window.history.replaceState({}, '', '/painel')
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Olá, Tester' })).toBeVisible()
  expect(window.location.pathname).toBe('/painel')
})
