import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { ApiError, authApi } from '../services/api'
import { beginOAuth } from './oauth'

vi.mock('../services/domain/auth.service', async original => ({ ...await original<object>(), authApi: { beginOAuth: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))
const assign = vi.fn()
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('window', { location: { assign } }) })
afterEach(() => { vi.unstubAllGlobals() })
it.each([['google', 'login'], ['discord', 'link']] as const)('inicia %s no modo %s e navega para autorização', async (provider, mode) => {
  vi.mocked(authApi.beginOAuth).mockResolvedValue({ authorization_url: 'https://provider.test/authorize?state=opaque' })
  await beginOAuth(provider, mode)
  expect(authApi.beginOAuth).toHaveBeenCalledWith(provider, mode)
  expect(assign).toHaveBeenCalledWith('https://provider.test/authorize?state=opaque')
})
it.each([new ApiError('Provedor desativado', 400, 'DISABLED'), new Error('network')])('exibe falha sem navegar: %s', async error => {
  vi.mocked(authApi.beginOAuth).mockRejectedValue(error)
  await beginOAuth('google', 'login')
  expect(assign).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalledWith(error instanceof ApiError ? error.message : 'Não foi possível iniciar a conexão.')
})
