// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { authApi } from '../services/api'
import { restoreSession } from '../services/infra/session'
import { refreshSession } from '../services/infra/http'

vi.mock('../services/infra/session', () => ({ restoreSession: vi.fn() }))
vi.mock('../services/infra/http', async importOriginal => ({ ...await importOriginal<object>(), refreshSession: vi.fn() }))
vi.mock('../services/domain/auth.service', async importOriginal => ({
  ...await importOriginal<object>(),
  authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), verifyTwoFactor: vi.fn(), logout: vi.fn() },
}))
const user = { id: 'hero-id', username: 'hero' } as any
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(restoreSession).mockResolvedValue({ user: null, retry: false })
})
afterEach(() => { cleanup(); vi.useRealTimers() })
const mount = () => renderHook(() => useAuth(), { wrapper: AuthProvider })

it('restaura sessão e encerra estado de carregamento', async () => {
  vi.mocked(restoreSession).mockResolvedValue({ user, retry: false })
  const { result } = mount()
  expect(result.current.loading).toBe(true)
  await waitFor(() => expect(result.current.user).toEqual(user))
  expect(result.current.loading).toBe(false)
})

it('mantém anonimato até concluir o segundo fator', async () => {
  vi.mocked(authApi.login).mockResolvedValue({ requires_2fa: true, challenge: 'token' })
  vi.mocked(authApi.verifyTwoFactor).mockResolvedValue(user)
  const { result } = mount()
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => { await result.current.login('hero', 'secret', 'captcha') })
  expect(result.current.user).toBeNull()
  expect(authApi.login).toHaveBeenCalledWith('hero', 'secret', 'captcha')
  await act(async () => { await result.current.verifyTwoFactor('token', '123456') })
  expect(result.current.user).toEqual(user)
})

it('login bem-sucedido e logout atualizam a sessão', async () => {
  vi.mocked(authApi.login).mockResolvedValue(user)
  vi.mocked(authApi.logout).mockResolvedValue({ ok: true })
  const { result } = mount()
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => { await result.current.login('hero', 'secret') })
  expect(result.current.user).toEqual(user)
  await act(async () => { await result.current.logout() })
  expect(result.current.user).toBeNull()
})

it('erro de login não autentica usuário', async () => {
  const error = new Error('Credenciais inválidas')
  vi.mocked(authApi.login).mockRejectedValue(error)
  const { result } = mount()
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => { await expect(result.current.login('hero', 'bad')).rejects.toBe(error) })
  expect(result.current.user).toBeNull()
})

it('cadastro e atualização de perfil usam dados retornados pela API', async () => {
  vi.mocked(authApi.register).mockResolvedValue(user)
  vi.mocked(authApi.me).mockResolvedValue({ ...user, display_name: 'Novo nome' })
  const { result } = mount()
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => { await result.current.register({ username: 'hero', email: 'a@b.dev', password: 'secret', accept_terms: true }) })
  expect(result.current.user).toEqual(user)
  await act(async () => { await result.current.refreshUser() })
  expect(result.current.user?.display_name).toBe('Novo nome')
})

it('repete restauração transitória e remove timers ao desmontar', async () => {
  vi.useFakeTimers()
  vi.mocked(restoreSession).mockResolvedValueOnce({ user: null, retry: true }).mockResolvedValueOnce({ user, retry: false })
  const { result, unmount } = mount()
  await act(async () => { await Promise.resolve() })
  expect(result.current.loading).toBe(false)
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
  expect(result.current.user).toEqual(user)
  await act(async () => { await vi.advanceTimersByTimeAsync(600000) })
  expect(refreshSession).toHaveBeenCalledTimes(1)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('descarta resposta de restauração recebida após desmontar', async () => {
  let complete!: (value: any) => void
  vi.mocked(restoreSession).mockReturnValue(new Promise(resolve => { complete = resolve }))
  const { unmount } = mount()
  unmount()
  await act(async () => { complete({ user, retry: true }) })
  expect(refreshSession).not.toHaveBeenCalled()
})

it('exige o provider para consumir sessão', () => {
  expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider')
})
