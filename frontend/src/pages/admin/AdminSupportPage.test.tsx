// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { staffSupportApi } from '../../services/api'
import type { ApiSupportTicket } from '../../services/types'
import { AdminSupportPage } from './AdminSupportPage'

vi.mock('../../services/domain/support.service', () => ({
  supportApi: {},
  staffSupportApi: { list: vi.fn(), detail: vi.fn(), reply: vi.fn(), update: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

let client: QueryClient
const ticket: ApiSupportTicket = {
  id: 'ticket-6',
  protocol: 'PDL-006',
  subject: 'Pagamento pendente',
  description: 'Saldo não creditado após o pagamento.',
  category: 'billing',
  category_label: 'Pagamento',
  priority: 'normal',
  priority_label: 'Normal',
  status: 'open',
  status_label: 'Aberto',
  context: {},
  assigned_to: 'Equipe PDL',
  created_at: '2026-09-02T10:00:00Z',
  updated_at: '2026-09-02T10:00:00Z',
  last_activity_at: '2026-09-02T10:00:00Z',
  first_response_at: null,
  resolved_at: null,
  closed_at: null,
  sla_due_at: '2026-09-03T10:00:00Z',
  sla_breached: false,
  customer: { id: 'user-1', display_name: 'Jogador', username: 'player', email: 'player@test.dev' },
  messages: [{ id: 'm1', body: 'Preciso de ajuda com o pagamento.', author_name: 'Jogador', is_staff_reply: false, is_internal: false, created_at: '2026-09-02T10:00:00Z' }],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(staffSupportApi.list).mockResolvedValue({
    results: [ticket],
    summary: { open: 1, in_progress: 0, waiting_user: 0, unassigned: 1, sla_breached: 0 },
  })
  vi.mocked(staffSupportApi.detail).mockResolvedValue(ticket)
  vi.mocked(staffSupportApi.reply).mockResolvedValue(ticket)
  vi.mocked(staffSupportApi.update).mockResolvedValue({ ...ticket, status: 'open', status_label: 'Aberto' })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear() })

function mount(path = '/painel/admin/atendimento?ticket=ticket-6') {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/painel/admin/atendimento" element={<AdminSupportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

it('permite responder chamado aberto', async () => {
  const user = mount()
  const input = await screen.findByRole('textbox', { name: /O jogador receberá uma notificação/ })
  await user.type(input, 'Vamos verificar o comprovante.')
  await user.click(screen.getByRole('button', { name: 'Enviar resposta' }))
  expect(staffSupportApi.reply).toHaveBeenCalledWith('ticket-6', 'Vamos verificar o comprovante.', false)
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Resposta enviada ao jogador'))
})

it.each(['closed', 'resolved'] as const)('esconde o formulário em chamado %s até reabrir', async status => {
  vi.mocked(staffSupportApi.detail).mockResolvedValue({ ...ticket, status, status_label: status === 'closed' ? 'Fechado' : 'Resolvido' })
  const user = mount()
  expect(await screen.findByText('Este atendimento foi finalizado')).toBeVisible()
  expect(screen.queryByRole('textbox', { name: /O jogador receberá uma notificação/ })).not.toBeInTheDocument()
  expect(staffSupportApi.reply).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Reabrir' }))
  expect(staffSupportApi.update).toHaveBeenCalledWith('ticket-6', { status: 'open' })
})
