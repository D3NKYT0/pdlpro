// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { NotificationCenter } from './NotificationCenter'
import i18n from '../../i18n'
import { notificationApi, pushApi, ApiError } from '../../services/api'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../services/domain/notification.service', () => ({
  notificationApi: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}))
vi.mock('../../services/domain/push.service', () => ({ pushApi: { vapid: vi.fn() } }))

const unreadNote = {
  id: 'note',
  title: 'Aviso',
  body: 'Seu pagamento foi creditado',
  kind: 'payment',
  link: '/panel/wallet',
  is_read: false,
  created_at: '2026-09-14T12:00:00.000Z',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(pushApi.vapid).mockResolvedValue({ enabled: false, public_key: '' })
  vi.mocked(notificationApi.list).mockResolvedValue({ unread: 1, results: [unreadNote] } as never)
})
afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('pt')
})

function mount() {
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <NotificationCenter />
      </QueryClientProvider>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Abrir notificações, 1 não lidas' }))
  await screen.findByText('Seu pagamento foi creditado')
}

it.each([false, true])('atualiza contador após leitura coletiva=%s', async (all) => {
  const user = mount()
  await openPanel(user)
  vi.mocked(notificationApi.list).mockResolvedValue({ unread: 0, results: [] })
  await user.click(screen.getByRole('button', { name: all ? 'Marcar todas' : 'Marcar como lida' }))
  if (all) expect(notificationApi.markAllRead).toHaveBeenCalledOnce()
  else expect(notificationApi.markRead).toHaveBeenCalledWith('note')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir notificações' })).toBeTruthy())
  expect(screen.queryByRole('button', { name: 'Marcar todas' })).toBeNull()
})

it('mostra falha sem remover aviso', async () => {
  vi.mocked(notificationApi.markRead).mockRejectedValue(new ApiError('Falha ao salvar', 503, 'UNAVAILABLE'))
  const user = mount()
  await openPanel(user)
  await user.click(screen.getByRole('button', { name: 'Marcar como lida' }))
  expect(toast.error).toHaveBeenCalledWith('Falha ao salvar')
  expect(screen.getByText('Seu pagamento foi creditado')).toBeTruthy()
})

it('traduz título, contador e ações no idioma ativo', async () => {
  vi.mocked(notificationApi.markAllRead).mockResolvedValue(undefined as never)
  await i18n.changeLanguage('en')
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Open notifications, 1 unread' }))
  expect(await screen.findByRole('heading', { name: 'Alerts' })).toBeTruthy()
  expect(screen.getByText('1 unread')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Mark all' }))
  expect(toast.success).toHaveBeenCalledWith('All marked as read')
})

it('abre o destino do aviso e fecha o painel', async () => {
  const user = mount()
  await openPanel(user)
  vi.mocked(notificationApi.list).mockResolvedValue({ unread: 0, results: [] })
  await user.click(screen.getByRole('link', { name: 'Abrir aviso' }))
  await waitFor(() => expect(notificationApi.markRead).toHaveBeenCalledWith('note'))
  expect(screen.queryByRole('dialog', { name: 'Avisos' })).toBeNull()
})

it('mostra estado vazio quando não há avisos', async () => {
  vi.mocked(notificationApi.list).mockResolvedValue({ unread: 0, results: [] })
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Abrir notificações' }))
  expect(await screen.findByText('Nenhum aviso ainda.')).toBeTruthy()
})
