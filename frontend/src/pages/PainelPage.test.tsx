// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { authApi, programsApi, serverApi } from '../services/api'
import i18n from '../i18n'
import { PainelPage } from './PainelPage'

const session = vi.hoisted(() => ({ user: { id: 'u1', username: 'denky', display_name: 'Denky' } }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('../services/domain/programs.service', () => ({ programsApi: { resources: vi.fn() } }))
vi.mock('../services/domain/server.service', () => ({ serverApi: { status: vi.fn() } }))
vi.mock('../services/domain/auth.service', async original => ({ ...await original<object>(), authApi: { progress: vi.fn() } }))

let client: QueryClient

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(programsApi.resources).mockResolvedValue([])
  vi.mocked(serverApi.status).mockResolvedValue({ game_online: true, login_online: false, players_online: 42 })
  vi.mocked(authApi.progress).mockImplementation(() => new Promise(() => {}))
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(async () => {
  cleanup()
  client.clear()
  await i18n.changeLanguage('pt')
})

function mount() {
  render(<QueryClientProvider client={client}><MemoryRouter><PainelPage /></MemoryRouter></QueryClientProvider>)
}

it('apresenta saudação, status do servidor e atalhos habilitados', async () => {
  mount()
  expect(screen.getByRole('heading', { name: 'Olá, Denky' })).toBeVisible()
  expect(screen.getByText('Jogadores online')).toBeVisible()
  expect(await screen.findByText('42')).toBeVisible()
  expect(screen.getByText('Online')).toBeVisible()
  expect(screen.getByText('Offline')).toBeVisible()
  expect(screen.getByRole('link', { name: /Carteira/ })).toHaveAttribute('href', '/painel/wallet')
})

it('esconde o atalho do recurso pausado', async () => {
  vi.mocked(programsApi.resources).mockResolvedValue([{ code: 'wallet', enabled: false }] as Awaited<ReturnType<typeof programsApi.resources>>)
  mount()
  await waitFor(() => expect(screen.queryByRole('link', { name: /Carteira/ })).not.toBeInTheDocument())
  expect(screen.getByRole('link', { name: /Meu perfil/ })).toBeVisible()
})

it('traduz saudação, status e atalhos no idioma ativo', async () => {
  await i18n.changeLanguage('en')
  mount()
  expect(screen.getByRole('heading', { name: 'Hello, Denky' })).toBeVisible()
  expect(screen.getByText('Account overview')).toBeVisible()
  expect(await screen.findByText('Players online')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Continue your adventure' })).toBeVisible()
  expect(screen.getByText('Balance, PIX and transfers')).toBeVisible()
})
