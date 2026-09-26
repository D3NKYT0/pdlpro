// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lineageApi } from '../services/api'
import { ActiveAccountProvider, useActiveAccount } from './ActiveAccountContext'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'testuser' } }),
}))

vi.mock('../services/domain/lineage.service', () => ({
  lineageApi: {
    accounts: vi.fn(),
    setActiveAccount: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

describe('ActiveAccountContext', () => {
  let client: QueryClient

  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    cleanup()
    client.clear()
    localStorage.clear()
  })

  it('usa fallback seguro quando chamado fora do provider', () => {
    const { result } = renderHook(() => useActiveAccount())
    expect(result.current.activeLogin).toBeNull()
    expect(result.current.accounts).toEqual([])
  })

  it('define a conta primária como ativa inicialmente', async () => {
    vi.mocked(lineageApi.accounts).mockResolvedValue({
      accounts: [
        { login: 'secondary_acc', is_primary: false, linked: true },
        { login: 'main_acc', is_primary: true, linked: true },
      ],
      slots: { used: 2, total: 5, can_link: true },
      primary: { login: 'main_acc', status: 'owned' },
    } as any)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <ActiveAccountProvider>{children}</ActiveAccountProvider>
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useActiveAccount(), { wrapper })

    await waitFor(() => {
      expect(result.current.activeLogin).toBe('main_acc')
      expect(result.current.accounts).toHaveLength(2)
    })
  })

  it('permite alternar a conta ativa e sincroniza com a API e localStorage', async () => {
    vi.mocked(lineageApi.accounts).mockResolvedValue({
      accounts: [
        { login: 'main_acc', is_primary: true, linked: true },
        { login: 'second_acc', is_primary: false, linked: true },
      ],
      slots: { used: 2, total: 5, can_link: true },
      primary: { login: 'main_acc', status: 'owned' },
    } as any)
    vi.mocked(lineageApi.setActiveAccount).mockResolvedValue(undefined as any)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <ActiveAccountProvider>{children}</ActiveAccountProvider>
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useActiveAccount(), { wrapper })

    await waitFor(() => {
      expect(result.current.activeLogin).toBe('main_acc')
    })

    await act(async () => {
      await result.current.setActiveAccount('second_acc')
    })

    expect(lineageApi.setActiveAccount).toHaveBeenCalledWith('second_acc')
    expect(result.current.activeLogin).toBe('second_acc')
    expect(localStorage.getItem('pdl_active_account')).toBe('second_acc')
  })
})
