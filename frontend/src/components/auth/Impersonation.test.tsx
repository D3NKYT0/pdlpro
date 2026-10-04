// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { SiteUsersAdmin } from './SiteUsersAdmin'
import { ImpersonationBanner } from './ImpersonationBanner'
import { authApi, reloadForIdentityChange } from '../../services/api'

const actor = vi.hoisted(() => ({ superuser: true }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { is_superuser: actor.superuser } }) }))
vi.mock('../../services/api', () => ({ authApi: { siteUsers: vi.fn(), impersonation: vi.fn(), startImpersonation: vi.fn(), stopImpersonation: vi.fn() }, reloadForIdentityChange: vi.fn() }))
const clients: QueryClient[] = []
function mount(element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  return render(<I18nextProvider i18n={i18n}><QueryClientProvider client={client}>{element}</QueryClientProvider></I18nextProvider>)
}
const row = { id: 'player', username: 'hero', display_name: 'Hero', email: 'hero@example.com', can_impersonate: true }
beforeEach(async () => { vi.resetAllMocks(); actor.superuser = true; await i18n.changeLanguage('pt') })
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()) })

it('lists users, searches, paginates and blocks duplicate sign-ins', async () => {
  vi.mocked(authApi.siteUsers).mockResolvedValue({ count: 21, results: [row, { ...row, id: 'admin', username: 'admin', can_impersonate: false }] })
  let resolve!: (value: never) => void
  vi.mocked(authApi.startImpersonation).mockImplementation(() => new Promise(done => { resolve = done }))
  mount(<SiteUsersAdmin />)
  const user = userEvent.setup()
  await screen.findByRole('button', { name: 'Entrar como hero' })
  expect((screen.getByRole('button', { name: 'Entrar como admin' }) as HTMLButtonElement).disabled).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Próxima' }))
  await waitFor(() => expect(authApi.siteUsers).toHaveBeenLastCalledWith('', 2))
  await user.click(screen.getByRole('button', { name: 'Anterior' }))
  await waitFor(() => expect(authApi.siteUsers).toHaveBeenLastCalledWith('', 1))
  await user.type(screen.getByLabelText('Buscar por usuário, nome ou e-mail'), 'hero')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(authApi.siteUsers).toHaveBeenLastCalledWith('hero', 1))
  const currentEnter = await screen.findByRole('button', { name: 'Entrar como hero' })
  await user.dblClick(currentEnter)
  expect(authApi.startImpersonation).toHaveBeenCalledTimes(1)
  expect((currentEnter as HTMLButtonElement).disabled).toBe(true)
  resolve({} as never)
  await waitFor(() => expect(reloadForIdentityChange).toHaveBeenCalledWith('/panel'))
})
it('shows loading, an empty result and a retriable query error', async () => {
  vi.mocked(authApi.siteUsers).mockImplementationOnce(() => new Promise(() => {}))
  const first = mount(<SiteUsersAdmin />)
  expect(screen.getByRole('status')).toBeTruthy()
  first.unmount()
  vi.mocked(authApi.siteUsers).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ count: 0, results: [] })
  mount(<SiteUsersAdmin />)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Unavailable'))
  await userEvent.click(screen.getByRole('button', { name: /tentar|novamente/i }))
  expect(await screen.findByText('Nenhum usuário encontrado.')).toBeTruthy()
})
it('hides the list for ordinary staff and shows sign-in failures', async () => {
  actor.superuser = false
  const first = mount(<SiteUsersAdmin />)
  expect(authApi.siteUsers).not.toHaveBeenCalled()
  first.unmount(); actor.superuser = true
  vi.mocked(authApi.siteUsers).mockResolvedValue({ count: 1, results: [row] })
  vi.mocked(authApi.startImpersonation).mockRejectedValue(new Error('Forbidden'))
  mount(<SiteUsersAdmin />)
  await userEvent.click(await screen.findByRole('button', { name: 'Entrar como hero' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Forbidden'))
  expect(reloadForIdentityChange).not.toHaveBeenCalled()
})
it('restores original identity with a fixed global return action and blocks duplicates', async () => {
  vi.mocked(authApi.impersonation).mockResolvedValue({ username: 'boss', target_username: 'hero' })
  let resolve!: (value: never) => void
  vi.mocked(authApi.stopImpersonation).mockImplementation(() => new Promise(done => { resolve = done }))
  mount(<ImpersonationBanner />)
  const button = await screen.findByRole('button', { name: 'Voltar para boss' })
  expect(screen.getByRole('complementary', { name: 'Você está acessando como hero.' })).toBeTruthy()
  expect(button.getAttribute('title')).toBe('Você está acessando como hero.')
  await userEvent.dblClick(button)
  expect(authApi.stopImpersonation).toHaveBeenCalledTimes(1)
  resolve({} as never)
  await waitFor(() => expect(reloadForIdentityChange).toHaveBeenCalledWith('/panel/admin/accounts'))
})
it('keeps the return action on failure and hides it outside impersonation', async () => {
  vi.mocked(authApi.impersonation).mockResolvedValueOnce(null)
  const first = mount(<ImpersonationBanner />)
  await waitFor(() => expect(authApi.impersonation).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole('button')).toBeNull()
  first.unmount()
  vi.mocked(authApi.impersonation).mockResolvedValue({ username: 'boss', target_username: 'hero' })
  vi.mocked(authApi.stopImpersonation).mockRejectedValue(new Error('Offline'))
  mount(<ImpersonationBanner />)
  await userEvent.click(await screen.findByRole('button', { name: 'Voltar para boss' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Offline'))
  expect(screen.getByRole('button', { name: 'Voltar para boss' })).toBeTruthy()
})
