// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import i18n from '../../i18n'
import { programsApi, serverApi, contentApi, ApiError, type Resource } from '../../services/api'
import { ResourceControlsProvider } from '../../contexts/ResourceControlsContext'
import { DashboardHero } from './DashboardHero'
import { AdminResourcesSection } from '../admin/programs/AdminResourcesSection'
import { HomePage } from '../../pages/HomePage'
import { StatsRow } from '../../theme/templates/atoms'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../theme/ThemeProvider', () => ({ useTheme: () => ({ presentation: null, name: undefined, description: undefined }) }))
let catalog: Resource[]
let client: QueryClient
const status = { game_online: true, login_online: false, players_online: 321 }
beforeEach(async () => {
  await i18n.changeLanguage('pt')
  catalog = [
    { id: 'status', code: 'server-status', name: 'Status do servidor', category: 'Conteúdo', description: '', enabled: true },
    { id: 'players', code: 'players-online', name: 'Jogadores online', category: 'Conteúdo', description: '', enabled: true },
  ]
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.spyOn(programsApi, 'resources').mockImplementation(async () => catalog.map(row => ({ ...row })))
  vi.spyOn(programsApi, 'toggleResource').mockImplementation(async (id, enabled) => {
    const row = catalog.find(item => item.id === id)!
    row.enabled = enabled
    return { ...row }
  })
  vi.spyOn(programsApi, 'publicSupporters').mockResolvedValue([])
  vi.spyOn(serverApi, 'status').mockResolvedValue(status)
  vi.spyOn(serverApi, 'info').mockResolvedValue({ name: 'Demo', description: '', chronicle: 'Interlude' } as never)
  vi.spyOn(serverApi, 'rankings').mockResolvedValue([])
  vi.spyOn(contentApi, 'news').mockResolvedValue([])
  vi.spyOn(contentApi, 'wiki').mockResolvedValue([])
})
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks() })
function mount(children: ReactNode) {
  render(<QueryClientProvider client={client}><ResourceControlsProvider><MemoryRouter>{children}</MemoryRouter></ResourceControlsProvider></QueryClientProvider>)
}
const hero = <DashboardHero user={null} status={status} gamesEnabled={false} />

it.each([[false, true], [true, false], [false, false], [true, true]])('shows players=%s and server=%s independently in the player panel', async (players, server) => {
  catalog[0].enabled = server
  catalog[1].enabled = players
  mount(hero)
  await waitFor(() => expect(programsApi.resources).toHaveBeenCalled())
  await waitFor(() => expect(client.getQueryState(['resources'])?.status).toBe('success'))
  expect(Boolean(screen.queryByText('Jogadores online'))).toBe(players)
  expect(Boolean(screen.queryByText('Game server'))).toBe(server)
  expect(Boolean(screen.queryByText('Login server'))).toBe(server)
  expect(Boolean(screen.queryByText('321'))).toBe(players)
  if (!players && !server) expect(document.querySelector('.dashboard-hero-status')).toBeNull()
})

it('admin toggles persist independently and update the visible player panel', async () => {
  mount(<><AdminResourcesSection />{hero}</>)
  await screen.findByText('321')
  await userEvent.click(screen.getByRole('checkbox', { name: /Desativar Jogadores online/i }))
  await waitFor(() => expect(programsApi.toggleResource).toHaveBeenCalledWith('players', false))
  await waitFor(() => expect(screen.queryByText('321')).not.toBeInTheDocument())
  expect(screen.getByText('Game server')).toBeVisible()
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /Desativar Status do servidor/i })).toBeEnabled())
  await userEvent.click(screen.getByRole('checkbox', { name: /Desativar Status do servidor/i }))
  await waitFor(() => expect(screen.queryByText('Game server')).not.toBeInTheDocument())
  await userEvent.click(screen.getByRole('checkbox', { name: /Ativar Jogadores online/i }))
  expect(await screen.findByText('321')).toBeVisible()
  expect(screen.queryByText('Game server')).not.toBeInTheDocument()
})

it('blocks duplicate changes and preserves the indicator on failure', async () => {
  let reject!: (reason: unknown) => void
  vi.mocked(programsApi.toggleResource).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
  mount(<><AdminResourcesSection />{hero}</>)
  await screen.findByText('321')
  await userEvent.dblClick(screen.getByRole('checkbox', { name: /Desativar Jogadores online/i }))
  expect(programsApi.toggleResource).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('checkbox', { name: /Atualizando/i })).toBeDisabled()
  reject(new ApiError('Sem permissão', 403, 'FORBIDDEN'))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /Desativar Jogadores online/i })).toBeEnabled())
  expect(screen.getByText('321')).toBeVisible()
})

it('does not show indicators while the catalog is loading or unavailable', async () => {
  let reject!: (reason: unknown) => void
  vi.mocked(programsApi.resources).mockImplementation(() => new Promise((_, fail) => { reject = fail }))
  mount(hero)
  expect(screen.queryByText('321')).not.toBeInTheDocument()
  reject(new Error('indisponível'))
  await waitFor(() => expect(client.getQueryState(['resources'])?.status).toBe('error'))
  expect(screen.queryByText('Game server')).not.toBeInTheDocument()
  expect(screen.queryByText('Jogadores online')).not.toBeInTheDocument()
})

it('default landing hides both indicators and skips its status query', async () => {
  catalog.forEach(row => { row.enabled = false })
  mount(<HomePage />)
  await waitFor(() => expect(serverApi.info).toHaveBeenCalled())
  await waitFor(() => expect(client.getQueryState(['resources'])?.status).toBe('success'))
  expect(document.querySelector('.server-plaque')).toBeInTheDocument()
  expect(screen.queryByText('321')).not.toBeInTheDocument()
  expect(document.querySelector('.server-plaque .is-online')).toBeNull()
  expect(serverApi.status).not.toHaveBeenCalled()
})

it('theme statistics hide dynamic indicators while retaining the chronicle', async () => {
  catalog.forEach(row => { row.enabled = false })
  mount(<StatsRow t={i18n.getFixedT('pt', 'public')} status={status} info={{ chronicle: 'Interlude' }} items={[
    { id: 'online', kind: 'online', label: 'Contagem ao vivo', value: '' },
    { id: 'status', kind: 'status', label: 'Estado ao vivo', value: '' },
    { id: 'chronicle', kind: 'chronicle', label: 'Crônica', value: '' },
  ]} />)
  expect(await screen.findByText('Interlude')).toBeVisible()
  expect(screen.queryByText('Contagem ao vivo')).not.toBeInTheDocument()
  expect(screen.queryByText('Estado ao vivo')).not.toBeInTheDocument()
})

it('omits an empty statistics group and its stale loading or error state', async () => {
  catalog.forEach(row => { row.enabled = false })
  mount(<StatsRow t={i18n.getFixedT('pt', 'public')} status={status} loading error={new Error('old status failure')} items={[
    { id: 'online', kind: 'online', label: 'Contagem ao vivo' },
    { id: 'status', kind: 'status', label: 'Estado ao vivo' },
  ]} />)
  await waitFor(() => expect(client.getQueryState(['resources'])?.status).toBe('success'))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(document.querySelector('.tpl-stats')).toBeNull()
})
