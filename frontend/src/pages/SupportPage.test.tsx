// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { ApiError, supportApi } from '../services/api'
import type { ApiSupportTicket } from '../services/types'
import { SupportPage } from './SupportPage'

vi.mock('../services/domain/support.service', () => ({ supportApi: { list: vi.fn(), detail: vi.fn(), create: vi.fn(), reply: vi.fn(), action: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let client: QueryClient
const ticket: ApiSupportTicket = {
  id: 'ticket', protocol: 'PDL-001', subject: 'Pagamento não chegou', description: 'Fiz um pagamento e não recebi o saldo.', category: 'billing', category_label: 'Pagamento', priority: 'normal', priority_label: 'Normal', status: 'open', status_label: 'Aberto', context: {}, assigned_to: 'Equipe', created_at: '2026-09-02T10:00:00Z', updated_at: '2026-09-02T10:00:00Z', last_activity_at: '2026-09-02T10:00:00Z', first_response_at: null, resolved_at: null, closed_at: null, sla_due_at: '2026-09-03T10:00:00Z', sla_breached: false,
  messages: [{ id: 'm1', body: 'Pode enviar o comprovante?', author_name: 'Admin', is_staff_reply: true, is_internal: false, created_at: '2026-09-02T10:00:00Z' }],
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(supportApi.list).mockResolvedValue({ results: [ticket], summary: { active: 1 } })
  vi.mocked(supportApi.detail).mockResolvedValue(ticket)
  vi.mocked(supportApi.create).mockResolvedValue(ticket)
  vi.mocked(supportApi.reply).mockResolvedValue(ticket)
  vi.mocked(supportApi.action).mockResolvedValue(ticket)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear() })
function mount(path = '/') {
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><SupportPage /></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
it('seleciona chamado e apresenta mensagem da equipe', async () => {
  mount()
  expect(await screen.findByText('Pode enviar o comprovante?')).toBeVisible()
  expect(supportApi.detail).toHaveBeenCalledWith('ticket')
  expect(screen.getByText('Equipe PDL')).toBeVisible()
})
it.each([false, true])('envia resposta; preserva mensagem quando falha=%s', async fail => {
  if (fail) vi.mocked(supportApi.reply).mockRejectedValue(new ApiError('Falha no envio', 503, 'UNAVAILABLE'))
  const user = mount()
  const input = await screen.findByRole('textbox', { name: 'Responder à equipe' })
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  await user.type(input, 'Segue o comprovante solicitado.')
  await user.click(screen.getByRole('button', { name: 'Enviar' }))
  expect(supportApi.reply).toHaveBeenCalledWith('ticket', 'Segue o comprovante solicitado.')
  await waitFor(() => expect(input).toHaveValue(fail ? 'Segue o comprovante solicitado.' : ''))
  if (fail) expect(toast.error).toHaveBeenCalledWith('Falha no envio')
  else await waitFor(() => expect(supportApi.detail).toHaveBeenCalledTimes(2))
})
it.each(['open', 'closed'])('permite ação apropriada no chamado %s', async status => {
  vi.mocked(supportApi.detail).mockResolvedValue({ ...ticket, status })
  const user = mount()
  await user.click(await screen.findByRole('button', { name: status === 'closed' ? 'Reabrir' : 'Encerrar' }))
  expect(supportApi.action).toHaveBeenCalledWith('ticket', status === 'closed' ? 'reopen' : 'close')
  if (status === 'closed') expect(screen.queryByRole('textbox', { name: 'Responder à equipe' })).not.toBeInTheDocument()
})
it('falha ao encerrar mantém o chamado disponível', async () => {
  vi.mocked(supportApi.action).mockRejectedValue(new ApiError('Atualização recusada', 409, 'CONFLICT'))
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Encerrar' }))
  expect(toast.error).toHaveBeenCalledWith('Atualização recusada')
  expect(screen.getByRole('button', { name: 'Encerrar' })).toBeEnabled()
})
it.each([false, true])('abre chamado com categoria e prioridade; erro=%s', async fail => {
  if (fail) vi.mocked(supportApi.create).mockRejectedValue(new ApiError('Não foi possível salvar', 503, 'UNAVAILABLE'))
  const user = mount()
  await user.click(screen.getAllByRole('button', { name: 'Novo chamado' })[0])
  expect(screen.getByRole('button', { name: 'Abrir chamado' })).toBeDisabled()
  await user.click(screen.getByRole('radio', { name: /Pagamento e loja/ }))
  await user.click(screen.getByRole('textbox', { name: 'Assunto' }))
  await user.paste(ticket.subject)
  await user.click(screen.getByRole('textbox', { name: 'Detalhes' }))
  await user.paste(ticket.description)
  await user.selectOptions(screen.getByRole('combobox', { name: 'Prioridade' }), 'urgent')
  await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
  expect(supportApi.create).toHaveBeenCalledWith({ subject: ticket.subject, description: ticket.description, category: 'billing', priority: 'urgent' })
  if (fail) {
    expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar')
    expect(screen.getByRole('textbox', { name: 'Assunto' })).toHaveValue(ticket.subject)
  } else expect(await screen.findByText('Pode enviar o comprovante?')).toBeVisible()
})
it('filtra chamados finalizados sem misturar a lista de ativos', async () => {
  vi.mocked(supportApi.list).mockResolvedValue({ results: [ticket, { ...ticket, id: 'closed', subject: 'Resolvido ontem', status: 'closed' }], summary: {} })
  const user = mount()
  const inbox = screen.getByRole('complementary')
  await within(inbox).findByText(ticket.subject)
  expect(within(inbox).queryByText('Resolvido ontem')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Finalizados' }))
  expect(within(inbox).getByText('Resolvido ontem')).toBeVisible()
  expect(within(inbox).queryByText(ticket.subject)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Todos' }))
  expect(within(inbox).getByText(ticket.subject)).toBeVisible()
})
it('abre o formulário com assunto da tela e não envia o histórico do chat', async () => {
  mount('/painel/support?subject=Ajuda:%20Carteira&from=%2Fpainel%2Fwallet')
  expect(await screen.findByRole('textbox', { name: 'Assunto' })).toHaveValue('Ajuda: Carteira')
  expect(screen.getByRole('textbox', { name: 'Detalhes' })).toHaveValue('Estou na tela Carteira (/painel/wallet) e preciso de ajuda da equipe.')
  expect(supportApi.create).not.toHaveBeenCalled()
})
