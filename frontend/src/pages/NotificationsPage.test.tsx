// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { NotificationsPage } from './NotificationsPage'
import { notificationApi, pushApi, ApiError } from '../services/api'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../services/domain/notification.service', () => ({ notificationApi: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() } }))
vi.mock('../services/domain/push.service', () => ({ pushApi: { vapid: vi.fn() } }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(pushApi.vapid).mockResolvedValue({ enabled: false, public_key: '' })
  vi.mocked(notificationApi.list).mockResolvedValue({ unread: 1, results: [{ id: 'note', title: 'Aviso', body: 'Seu pagamento foi creditado', kind: 'payment', is_read: false }] } as any)
})
afterEach(cleanup)
function mount() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><NotificationsPage /></QueryClientProvider>)
  return userEvent.setup()
}
it.each([false, true])('atualiza contador após leitura coletiva=%s', async all => {
  const user = mount()
  await screen.findByText('Seu pagamento foi creditado')
  vi.mocked(notificationApi.list).mockResolvedValue({ unread: 0, results: [] })
  await user.click(screen.getByRole('button', { name: all ? 'Marcar todas' : 'Marcar como lida' }))
  if (all) expect(notificationApi.markAllRead).toHaveBeenCalledOnce()
  else expect(notificationApi.markRead).toHaveBeenCalledWith('note')
  await waitFor(() => expect(screen.getByText('0 não lidos')).toBeTruthy())
  expect(screen.queryByRole('button', { name: 'Marcar todas' })).toBeNull()
})
it('mostra falha sem remover aviso', async () => {
  vi.mocked(notificationApi.markRead).mockRejectedValue(new ApiError('Falha ao salvar', 503, 'UNAVAILABLE'))
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Marcar como lida' }))
  expect(toast.error).toHaveBeenCalledWith('Falha ao salvar')
  expect(screen.getByText('Seu pagamento foi creditado')).toBeTruthy()
})
