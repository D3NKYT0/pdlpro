// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { authApi, ApiError } from '../services/api'
import { AccountSecurityPage } from './AccountSecurityPage'

const session = vi.hoisted(() => ({
  user: { email: 'user@test.dev', is_email_verified: false, is_2fa_enabled: false },
  refreshUser: vi.fn(),
  logout: vi.fn(),
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('../services/domain/auth.service', async original => ({
  ...await original<object>(),
  authApi: {
    capabilities: vi.fn(),
    passkeys: vi.fn(),
    sessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
    requestEmailVerification: vi.fn(),
    setupTwoFactor: vi.fn(),
    confirmTwoFactor: vi.fn(),
    disableTwoFactor: vi.fn(),
    beginPasskeyRegistration: vi.fn(),
    completePasskeyRegistration: vi.fn(),
    deletePasskey: vi.fn(),
  },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  session.user.is_2fa_enabled = false
  session.user.is_email_verified = false
  vi.mocked(authApi.capabilities).mockResolvedValue({ passkeys: true, two_factor: true, email_verification: true, captcha: false, hcaptcha_site_key: '', google: false, discord: false, connected_providers: [] })
  vi.mocked(authApi.passkeys).mockResolvedValue([])
  vi.mocked(authApi.sessions).mockResolvedValue([
    { id: 'current', created_at: '2026-09-01T12:00:00Z', expires_at: '2026-09-08T12:00:00Z', current: true },
    { id: 'other', created_at: '2026-09-02T08:00:00Z', expires_at: '2026-09-09T08:00:00Z', current: false },
  ])
  vi.mocked(authApi.setupTwoFactor).mockResolvedValue({ secret: 'SECRET123', enabled: false, otpauth_url: 'otpauth://totp/PDL' })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
function mount() {
  render(<QueryClientProvider client={client}><AccountSecurityPage /></QueryClientProvider>)
  return userEvent.setup()
}
it.each([false, true])('reenvio de verificação informa e-mail já confirmado=%s', async verified => {
  vi.mocked(authApi.requestEmailVerification).mockResolvedValue({ already_verified: verified } as Awaited<ReturnType<typeof authApi.requestEmailVerification>>)
  const user = mount()
  await user.click(screen.getByRole('button', { name: 'Reenviar verificação' }))
  expect(authApi.requestEmailVerification).toHaveBeenCalledTimes(1)
  expect(toast.success).toHaveBeenCalledWith(verified ? 'Seu e-mail já está verificado.' : 'Enviamos um novo link de verificação.')
})
it('não oferece reenvio quando e-mail está confirmado', () => {
  session.user.is_email_verified = true
  mount()
  expect(screen.queryByRole('button', { name: 'Reenviar verificação' })).not.toBeInTheDocument()
  expect(screen.getByText('Identidade de e-mail confirmada')).toBeVisible()
})
it('empilha e-mail, 2FA, passkeys e conexões ao lado das sessões', () => {
  const { container } = render(<QueryClientProvider client={client}><AccountSecurityPage /></QueryClientProvider>)
  const side = container.querySelector('.security-side')
  const sessions = container.querySelector('.security-sessions')
  expect(side).toBeTruthy()
  expect(sessions).toBeTruthy()
  expect(side?.previousElementSibling).toBe(sessions)
  expect(side?.querySelector('.security-email')).toBeTruthy()
  expect(side?.querySelector('.security-passkeys')).toBeTruthy()
  expect(side?.querySelector('.security-connections')).toBeTruthy()
  expect(side?.textContent).toMatch(/Autenticação em duas etapas/)
})
it.each([false, true])('confirma 2FA com código; erro=%s', async fail => {
  if (fail) vi.mocked(authApi.confirmTwoFactor).mockRejectedValue(new ApiError('Código incorreto', 400, 'INVALID'))
  const user = mount()
  await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))
  expect(await screen.findByText('SECRET123')).toBeVisible()
  await user.type(screen.getByRole('textbox', { name: 'Código de 6 dígitos' }), '123456')
  await user.click(screen.getByRole('button', { name: 'Confirmar ativação' }))
  expect(authApi.confirmTwoFactor).toHaveBeenCalledWith('123456')
  if (fail) {
    expect(toast.error).toHaveBeenCalledWith('Código incorreto')
    expect(screen.getByRole('textbox', { name: 'Código de 6 dígitos' })).toHaveValue('123456')
    expect(session.refreshUser).not.toHaveBeenCalled()
  } else {
    expect(session.refreshUser).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('SECRET123')).not.toBeInTheDocument()
  }
})
it('desativa 2FA usando código atual', async () => {
  session.user.is_2fa_enabled = true
  const user = mount()
  await user.type(screen.getByRole('textbox', { name: 'Código de 6 dígitos' }), '654321')
  await user.click(screen.getByRole('button', { name: 'Desativar 2FA' }))
  expect(authApi.disableTwoFactor).toHaveBeenCalledWith('654321')
  expect(toast.success).toHaveBeenCalledWith('2FA desativado.')
})
it('explica falta de suporte a passkeys sem iniciar registro', async () => {
  vi.stubGlobal('PublicKeyCredential', undefined)
  const user = mount()
  await user.click(screen.getByRole('button', { name: 'Adicionar passkey' }))
  expect(authApi.beginPasskeyRegistration).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalledWith('Este navegador não oferece suporte a passkeys.')
})
it('cancelamento do navegador não completa registro da chave', async () => {
  vi.stubGlobal('PublicKeyCredential', class {})
  const create = vi.fn().mockResolvedValue(null)
  vi.stubGlobal('navigator', { credentials: { create } })
  vi.mocked(authApi.beginPasskeyRegistration).mockResolvedValue({ state: 'signed', options: { challenge: 'AQI', user: { id: 'AQI', name: 'user', displayName: 'User' }, rp: { name: 'PDL' }, pubKeyCredParams: [] } })
  const user = mount()
  await user.click(screen.getByRole('button', { name: 'Adicionar passkey' }))
  expect(create).toHaveBeenCalledWith({ publicKey: expect.objectContaining({ challenge: new Uint8Array([1, 2]).buffer }) })
  expect(authApi.completePasskeyRegistration).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalledWith('Não foi possível adicionar a chave.')
})
it.each([false, true])('remoção de passkey atualiza lista apenas após sucesso; erro=%s', async fail => {
  vi.mocked(authApi.passkeys).mockResolvedValue([{ id: 'key', nickname: 'Notebook', created_at: '2026-09-02', last_used_at: null }])
  if (fail) vi.mocked(authApi.deletePasskey).mockRejectedValue(new ApiError('Remoção recusada', 400, 'INVALID'))
  const user = mount()
  await screen.findByText('Notebook')
  await user.click(screen.getByTitle('Remover chave'))
  expect(authApi.deletePasskey).toHaveBeenCalledWith('key')
  if (fail) expect(toast.error).toHaveBeenCalledWith('Remoção recusada')
  else await waitFor(() => expect(authApi.passkeys).toHaveBeenCalledTimes(2))
})

it('lista sessões e encerra outra sem sair da conta', async () => {
  vi.mocked(authApi.sessions).mockResolvedValue([
    { id: 'current', created_at: '2026-09-01T12:00:00Z', expires_at: '2026-09-08T12:00:00Z', current: true },
    { id: 'other', created_at: '2026-09-02T08:00:00Z', expires_at: '2026-09-09T08:00:00Z', current: false },
  ])
  vi.mocked(authApi.revokeSession).mockResolvedValue({ ok: true, current: false })
  const user = mount()
  expect(await screen.findByRole('heading', { name: 'Sessões abertas' })).toBeVisible()
  expect(await screen.findByText('Este navegador')).toBeVisible()
  expect(screen.getByText('Outra sessão')).toBeVisible()
  await user.click(screen.getByTitle('Encerrar sessão'))
  expect(authApi.revokeSession).toHaveBeenCalledWith('other')
  expect(session.logout).not.toHaveBeenCalled()
  await waitFor(() => expect(authApi.sessions).toHaveBeenCalledTimes(2))
  expect(toast.success).toHaveBeenCalledWith('Sessão encerrada.')
})

it('sair da sessão atual chama logout', async () => {
  session.logout.mockResolvedValue(undefined)
  const user = mount()
  await screen.findByText('Este navegador')
  await user.click(screen.getByTitle('Sair desta sessão'))
  expect(authApi.revokeSession).not.toHaveBeenCalled()
  expect(session.logout).toHaveBeenCalledTimes(1)
  expect(toast.success).toHaveBeenCalledWith('Sessão encerrada.')
})

it('encerra as demais sessões de uma vez', async () => {
  vi.mocked(authApi.revokeOtherSessions).mockResolvedValue({ ok: true, revoked: 1 })
  const user = mount()
  await screen.findByRole('button', { name: 'Encerrar outras sessões' })
  await user.click(screen.getByRole('button', { name: 'Encerrar outras sessões' }))
  expect(authApi.revokeOtherSessions).toHaveBeenCalledTimes(1)
  expect(toast.success).toHaveBeenCalledWith('1 sessão(ões) encerrada(s).')
})
