// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { authApi, ApiError } from '../services/api'
import { RegisterPage } from './RegisterPage'

const session = vi.hoisted(() => ({
  user: null as null | { username: string; has_usable_password?: boolean },
  loading: false,
  register: vi.fn(),
}))
const oauth = vi.hoisted(() => ({ beginOAuth: vi.fn() }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('../lib/oauth', () => ({ beginOAuth: oauth.beginOAuth }))
vi.mock('../services/domain/auth.service', async original => ({ ...await original<object>(), authApi: { capabilities: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@hcaptcha/react-hcaptcha', () => ({ default: ({ onVerify, onExpire }: { onVerify: (token: string) => void; onExpire: () => void }) => <><button type="button" onClick={() => onVerify('captcha')}>Resolver</button><button type="button" onClick={onExpire}>Expirar</button></> }))
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  session.user = null
  session.loading = false
  vi.mocked(authApi.capabilities).mockResolvedValue({ passkeys: true, two_factor: true, email_verification: true, captcha: false, hcaptcha_site_key: 'sitekey', google: false, discord: false, connected_providers: [] })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear() })
function mount() {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/painel" element={<h1>Painel autenticado</h1>} />
          <Route path="/painel/security" element={<h1>Gerenciador de sessões</h1>} />
          <Route path="/complete-account" element={<h1>Completar conta</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
it.each([false, true])('cadastro envia consentimento; erro=%s', async fail => {
  if (fail) session.register.mockRejectedValue(new ApiError('E-mail já cadastrado', 400, 'DUPLICATE'))
  const user = mount()
  await user.type(screen.getByLabelText('Usuário'), 'hero')
  await user.type(screen.getByLabelText('E-mail'), 'hero@test.dev')
  await user.type(screen.getByLabelText('Senha', { selector: 'input' }), 'Secret123!')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Crie sua conta mestra' }))
  expect(session.register).toHaveBeenCalledWith({ username: 'hero', email: 'hero@test.dev', password: 'Secret123!', accept_terms: true, hcaptcha_token: '' })
  if (fail) {
    expect(toast.error).toHaveBeenCalledWith('E-mail já cadastrado')
    expect(screen.getByLabelText('E-mail')).toHaveValue('hero@test.dev')
  } else expect(await screen.findByRole('heading', { name: 'Painel autenticado' })).toBeVisible()
})
it('CAPTCHA habilita envio e expiração volta a bloquear', async () => {
  const capabilities = await authApi.capabilities()
  vi.mocked(authApi.capabilities).mockResolvedValue({ ...capabilities, captcha: true })
  const user = mount()
  await screen.findByRole('button', { name: 'Resolver' })
  const submit = screen.getByRole('button', { name: 'Crie sua conta mestra' })
  expect(submit).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Resolver' }))
  expect(submit).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Expirar' }))
  expect(submit).toBeDisabled()
  expect(session.register).not.toHaveBeenCalled()
})
it('provedores sociais desabilitados sem credenciais e iniciam OAuth quando disponíveis', async () => {
  mount()
  await waitFor(() => expect(authApi.capabilities).toHaveBeenCalled())
  expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Discord' })).toBeDisabled()

  const capabilities = await authApi.capabilities()
  vi.mocked(authApi.capabilities).mockResolvedValue({ ...capabilities, google: true, discord: true })
  client.clear()
  cleanup()
  const enabled = mount()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Google' })).toBeEnabled())
  await enabled.click(screen.getByRole('button', { name: 'Google' }))
  expect(oauth.beginOAuth).toHaveBeenCalledWith('google', 'login')
  await enabled.click(screen.getByRole('button', { name: 'Discord' }))
  expect(oauth.beginOAuth).toHaveBeenCalledWith('discord', 'login')
})
it('leva quem já está logado ao gerenciador de sessões', async () => {
  session.user = { username: 'hero', has_usable_password: true }
  mount()
  expect(await screen.findByRole('heading', { name: 'Gerenciador de sessões' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Crie sua conta mestra' })).toBeNull()
})
it('envia conta social sem senha para completar o cadastro', async () => {
  session.user = { username: 'oauth', has_usable_password: false }
  mount()
  expect(await screen.findByRole('heading', { name: 'Completar conta' })).toBeVisible()
})
