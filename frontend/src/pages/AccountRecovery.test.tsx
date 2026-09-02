// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import toast from 'react-hot-toast'
import { ApiError, authApi } from '../services/api'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { VerifyEmailPage } from './VerifyEmailPage'
import { OAuthCallbackPage } from './OAuthCallbackPage'

const refreshUser = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ refreshUser }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../services/domain/auth.service', async original => ({ ...await original<object>(), authApi: { requestPasswordReset: vi.fn(), confirmPasswordReset: vi.fn(), verifyEmail: vi.fn(), completeOAuth: vi.fn() } }))
beforeEach(() => { vi.resetAllMocks() })
afterEach(cleanup)
function Location() { const location = useLocation(); return <><h1>{location.pathname}</h1><output>{location.state?.oauthChallenge}</output></> }
function mount(page: ReactElement, url = '/start', path = '/start') {
  render(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={page} /><Route path="*" element={<Location />} /></Routes></MemoryRouter>)
  return userEvent.setup()
}

it('recuperação de senha usa mensagem que não revela existência da conta', async () => {
  vi.mocked(authApi.requestPasswordReset).mockResolvedValue({ sent: true })
  const user = mount(<ForgotPasswordPage />)
  await user.type(screen.getByLabelText('Seu e-mail'), 'hero@test.dev')
  await user.click(screen.getByRole('button', { name: 'Enviar instruções' }))
  expect(authApi.requestPasswordReset).toHaveBeenCalledWith('hero@test.dev')
  expect(toast.success).toHaveBeenCalledWith('Se o e-mail existir, enviamos o link de redefinição.')
})
it('falha de recuperação permanece no formulário', async () => {
  vi.mocked(authApi.requestPasswordReset).mockRejectedValue(new ApiError('Aguarde', 429, 'RATE_LIMIT'))
  const user = mount(<ForgotPasswordPage />)
  await user.type(screen.getByLabelText('Seu e-mail'), 'hero@test.dev')
  await user.click(screen.getByRole('button', { name: 'Enviar instruções' }))
  expect(toast.error).toHaveBeenCalledWith('Aguarde')
  expect(screen.getByLabelText('Seu e-mail')).toHaveValue('hero@test.dev')
})
it('link sem token não permite redefinir senha', () => {
  mount(<ResetPasswordPage />)
  expect(screen.getByRole('button', { name: 'Salvar senha' })).toBeDisabled()
  expect(screen.getByText('Link inválido.')).toBeVisible()
  expect(authApi.confirmPasswordReset).not.toHaveBeenCalled()
})
it('redefinição envia token e nova senha e retorna ao login', async () => {
  vi.mocked(authApi.confirmPasswordReset).mockResolvedValue({ reset: true })
  const user = mount(<ResetPasswordPage />, '/start?token=signed')
  await user.type(screen.getByLabelText('Nova senha', { selector: 'input' }), 'Secret123')
  await user.click(screen.getByRole('button', { name: 'Salvar senha' }))
  expect(authApi.confirmPasswordReset).toHaveBeenCalledWith('signed', 'Secret123')
  expect(await screen.findByRole('heading', { name: '/login' })).toBeVisible()
})
it('token rejeitado mantém a tela e informa mensagem da API', async () => {
  vi.mocked(authApi.confirmPasswordReset).mockRejectedValue(new ApiError('Token expirado', 400, 'INVALID_TOKEN'))
  const user = mount(<ResetPasswordPage />, '/start?token=signed')
  await user.type(screen.getByLabelText('Nova senha', { selector: 'input' }), 'Secret123')
  await user.click(screen.getByRole('button', { name: 'Salvar senha' }))
  expect(toast.error).toHaveBeenCalledWith('Token expirado')
  expect(screen.queryByRole('heading', { name: '/login' })).toBeNull()
})
it.each([true, false])('verificação de e-mail apresenta resultado sucesso=%s', async success => {
  if (success) vi.mocked(authApi.verifyEmail).mockResolvedValue({ verified: true })
  else vi.mocked(authApi.verifyEmail).mockRejectedValue(new ApiError('Token expirado', 400, 'INVALID_TOKEN'))
  mount(<VerifyEmailPage />, '/start?token=signed')
  expect(await screen.findByText(success ? 'E-mail confirmado. Você já pode usar a conta.' : 'Token expirado')).toBeVisible()
  expect(authApi.verifyEmail).toHaveBeenCalledWith('signed')
})
it('verificação sem token não chama o backend', () => {
  mount(<VerifyEmailPage />)
  expect(screen.getByText('Link inválido.')).toBeVisible()
  expect(authApi.verifyEmail).not.toHaveBeenCalled()
})
it.each([
  [{ username: 'hero' }, '/painel', null],
  [{ linked: true }, '/painel/security', null],
  [{ requires_2fa: true, challenge: 'challenge' }, '/login', 'challenge'],
] as const)('callback OAuth respeita resultado %j', async (response, destination, challenge) => {
  vi.mocked(authApi.completeOAuth).mockResolvedValue(response as any)
  mount(<OAuthCallbackPage />, '/callback/google?code=code&state=state', '/callback/:provider')
  expect(await screen.findByRole('heading', { name: destination })).toBeVisible()
  expect(authApi.completeOAuth).toHaveBeenCalledOnce()
  expect(authApi.completeOAuth).toHaveBeenCalledWith('google', 'code', 'state')
  if (challenge) { expect(screen.getByRole('status')).toHaveTextContent(challenge); expect(refreshUser).not.toHaveBeenCalled() }
})
it.each(['/callback/unknown?code=c&state=s', '/callback/google?code=c', '/callback/discord?state=s'])('callback inválido %s não troca credenciais', async url => {
  mount(<OAuthCallbackPage />, url, '/callback/:provider')
  expect(await screen.findByRole('heading', { name: '/login' })).toBeVisible()
  expect(authApi.completeOAuth).not.toHaveBeenCalled()
})
it('erro do provedor retorna ao login', async () => {
  vi.mocked(authApi.completeOAuth).mockRejectedValue(new ApiError('Expirado', 400, 'OAUTH_STATE_INVALID'))
  mount(<OAuthCallbackPage />, '/callback/google?code=c&state=s', '/callback/:provider')
  expect(await screen.findByRole('heading', { name: '/login' })).toBeVisible()
  expect(toast.error).toHaveBeenCalledWith('Expirado')
})
