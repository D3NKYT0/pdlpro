// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { LoginPage } from './LoginPage'
import { authApi, ApiError } from '../services/api'

const session = vi.hoisted(() => ({ login: vi.fn(), verifyTwoFactor: vi.fn(), refreshUser: vi.fn() }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../services/domain/auth.service', async original => ({ ...await original<object>(), authApi: { capabilities: vi.fn() } }))
vi.mock('@hcaptcha/react-hcaptcha', () => ({ default: ({ onVerify }: { onVerify: (token: string) => void }) => <button type="button" onClick={() => onVerify('captcha-token')}>Resolver CAPTCHA</button> }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authApi.capabilities).mockResolvedValue({ google: false, discord: false, hcaptcha_site_key: 'sitekey' } as any)
})
afterEach(cleanup)
function Destination() { const location = useLocation(); return <h1>{location.pathname}{location.search}</h1> }
function mount(next = '/painel') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/login?next=${encodeURIComponent(next)}`]}><Routes>
    <Route path="/login" element={<LoginPage />} /><Route path="*" element={<Destination />} />
  </Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Usuário'), 'hero')
  await user.type(screen.getByLabelText('Senha', { selector: 'input' }), 'secret')
  await user.click(screen.getByRole('button', { name: 'Entrar no Reino' }))
}

it.each(['/painel/wallet?tab=history', 'https://evil.test', '//evil.test'])('redireciona apenas para destino local: %s', async next => {
  session.login.mockResolvedValue({ username: 'hero' })
  const user = mount(next)
  await fill(user)
  expect(session.login).toHaveBeenCalledWith('hero', 'secret', '')
  expect(await screen.findByRole('heading', { name: next.startsWith('/painel') ? next : '/painel' })).toBeTruthy()
})

it('pede o segundo fator antes de abrir a área privada', async () => {
  session.login.mockResolvedValue({ requires_2fa: true, challenge: 'signed' })
  session.verifyTwoFactor.mockResolvedValue(undefined)
  const user = mount()
  await fill(user)
  await user.type(await screen.findByLabelText('Código do autenticador'), '123456')
  expect(screen.queryByRole('heading', { name: '/painel' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(session.verifyTwoFactor).toHaveBeenCalledWith('signed', '123456')
  expect(await screen.findByRole('heading', { name: '/painel' })).toBeTruthy()
})

it('mostra erro da API e envia CAPTCHA quando solicitado', async () => {
  session.login.mockRejectedValueOnce(new ApiError('Resolva o CAPTCHA', 400, 'CAPTCHA_REQUIRED', { captcha_required: true })).mockResolvedValueOnce({ username: 'hero' })
  const user = mount()
  await fill(user)
  expect(toast.error).toHaveBeenCalledWith('Resolva o CAPTCHA')
  await user.click(await screen.findByRole('button', { name: 'Resolver CAPTCHA' }))
  await user.click(screen.getByRole('button', { name: 'Entrar no Reino' }))
  expect(session.login).toHaveBeenLastCalledWith('hero', 'secret', 'captcha-token')
})

it('provedores não configurados permanecem desabilitados', async () => {
  mount()
  await waitFor(() => expect(authApi.capabilities).toHaveBeenCalled())
  expect((screen.getByRole('button', { name: 'Google' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: 'Discord' }) as HTMLButtonElement).disabled).toBe(true)
})
