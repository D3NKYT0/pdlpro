// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { UserAccessManager } from './UserAccessManager'
import { authApi, type ApiUserAccess } from '../../services/api'
import toast from 'react-hot-toast'

vi.mock('../../services/api', () => ({ authApi: { accessRoles: vi.fn(), userAccess: vi.fn(), updateUserAccess: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }))
const clients: QueryClient[] = []
const state: ApiUserAccess = { id: 'target', username: 'hero', role: 'player', additional_roles: [], is_staff: false, is_superuser: false, capabilities: [], extra_capabilities: [], explicit_permissions: [], other_groups: [], revision: 'a'.repeat(64) }
const catalog = { roles: { player: [], supporter: [], editor: ['content.view', 'content.manage'], partner: [], promoter: [] } }
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  render(<I18nextProvider i18n={i18n}><QueryClientProvider client={client}><UserAccessManager id="target" username="hero" onClose={vi.fn()} /></QueryClientProvider></I18nextProvider>)
}
beforeEach(async () => { vi.resetAllMocks(); await i18n.changeLanguage('pt'); vi.mocked(authApi.userAccess).mockResolvedValue(state); vi.mocked(authApi.accessRoles).mockResolvedValue(catalog) })
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()) })

it('updates the explanation when personal roles change without inventing administrative grants', async () => {
  mount()
  const user = userEvent.setup()
  await screen.findByRole('button', { name: 'Salvar papéis' })
  const preview = within(screen.getByRole('region', { name: 'Capacidades após salvar' }))
  await user.click(screen.getByRole('combobox'))
  await user.click(screen.getByRole('option', { name: 'Parceiro' }))
  expect(preview.getByText('Identifica a parceria. Não concede acesso a dados de outros parceiros nem aprovações ou comissões automaticamente.')).toBeVisible()
  await user.click(screen.getByRole('checkbox', { name: 'Divulgador' }))
  expect(preview.getByText('Identifica a divulgação. Não concede administração nem cria campanhas automaticamente.')).toBeVisible()
  await user.click(screen.getByRole('checkbox', { name: 'Apoiador' }))
  expect(preview.getByText('Identifica o apoiador. Benefícios e comissões seguem as regras e aprovações do programa; o cargo não os libera automaticamente.')).toBeVisible()
  await user.click(screen.getByRole('checkbox', { name: 'Divulgador' }))
  expect(preview.queryByText('Identifica a divulgação. Não concede administração nem cria campanhas automaticamente.')).not.toBeInTheDocument()
  expect(preview.queryByText('Conteúdo — Gerenciar')).not.toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'Editor' }))
  expect(preview.getByText('Conteúdo — Gerenciar')).toBeVisible()
  await user.click(screen.getByRole('checkbox', { name: 'Editor' }))
  expect(preview.queryByText('Conteúdo — Gerenciar')).not.toBeInTheDocument()
})

it.each([
  ['en', 'Partner', 'Identifies the partnership. Does not grant access to other partners’ data or automatically grant approvals or commissions.'],
  ['es', 'Socio', 'Identifica la colaboración. No concede acceso a datos de otros socios ni aprobaciones o comisiones automáticamente.'],
])('explains the selected personal role in %s', async (language, label, description) => {
  await i18n.changeLanguage(language)
  mount()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('combobox'))
  await user.click(screen.getByRole('option', { name: label }))
  expect(screen.getByText(description)).toBeVisible()
})

it('previews combined roles and saves the exact access payload only once', async () => {
  let finish!: (value: ApiUserAccess) => void
  vi.mocked(authApi.updateUserAccess).mockImplementation(() => new Promise(resolve => { finish = resolve }))
  mount()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('combobox', { name: 'Papel principal' }))
  await user.click(screen.getByRole('option', { name: 'Editor' }))
  await user.click(screen.getByRole('checkbox', { name: 'Parceiro' }))
  await user.click(screen.getByRole('checkbox', { name: 'Permitir entrada no Django Admin' }))
  expect(screen.getByText('Conteúdo — Gerenciar')).toBeVisible()
  const save = screen.getByRole('button', { name: 'Salvar papéis' })
  await user.dblClick(save)
  expect(authApi.updateUserAccess).toHaveBeenCalledTimes(1)
  expect(authApi.updateUserAccess).toHaveBeenCalledWith('target', { role: 'editor', additional_roles: ['partner'], is_staff: true, revision: state.revision })
  expect(save).toBeDisabled()
  finish({ ...state, role: 'editor', additional_roles: ['partner'], is_staff: true, revision: 'b'.repeat(64) })
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Papéis atualizados.'))
})

it('shows loading, retries failures and explains preserved grants', async () => {
  vi.mocked(authApi.userAccess).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ ...state, extra_capabilities: ['finance.view'], explicit_permissions: ['accounts.finance_view'], other_groups: ['Auditor'] })
  mount()
  expect(screen.getByRole('status')).toBeVisible()
  expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable')
  await userEvent.click(screen.getByRole('button', { name: /tentar|novamente/i }))
  expect(await screen.findByText('Finanças — Consultar')).toBeVisible()
  await userEvent.click(screen.getByText('Concessões adicionais preservadas'))
  expect(screen.getByText('accounts.finance_view')).toBeVisible()
  expect(screen.getByText('Auditor')).toBeVisible()
})

it('retains selections on update failure and can retry', async () => {
  vi.mocked(authApi.updateUserAccess).mockRejectedValueOnce(new Error('Conflict')).mockResolvedValueOnce(state)
  mount()
  const save = await screen.findByRole('button', { name: 'Salvar papéis' })
  await userEvent.click(save)
  expect(await screen.findByRole('alert')).toHaveTextContent('Conflict')
  await userEvent.click(save)
  await waitFor(() => expect(authApi.updateUserAccess).toHaveBeenCalledTimes(2))
})

it('keeps superadministrator access read only', async () => {
  vi.mocked(authApi.userAccess).mockResolvedValue({ ...state, is_superuser: true })
  mount()
  expect(await screen.findByRole('button', { name: 'Salvar papéis' })).toBeDisabled()
  expect(screen.getByRole('combobox')).toBeDisabled()
  expect(screen.getByText('Superadministradores são gerenciados exclusivamente pelo Jazzmin.')).toBeVisible()
  expect(authApi.updateUserAccess).not.toHaveBeenCalled()
})

it('previews explicit role group grants only while the corresponding group is selected', async () => {
  vi.mocked(authApi.accessRoles).mockResolvedValue({ ...catalog, additional_role_capabilities: { ...catalog.roles, editor: ['content.view', 'content.manage', 'finance.view'] } })
  mount()
  const user = userEvent.setup()
  await screen.findByRole('button', { name: 'Salvar papéis' })
  await user.click(screen.getByRole('combobox'))
  await user.click(screen.getByRole('option', { name: 'Editor' }))
  expect(screen.queryByText('Finanças — Consultar')).not.toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'Editor' }))
  expect(screen.getByText('Finanças — Consultar')).toBeVisible()
  await user.click(screen.getByRole('checkbox', { name: 'Editor' }))
  expect(screen.queryByText('Finanças — Consultar')).not.toBeInTheDocument()
})
