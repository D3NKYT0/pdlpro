// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import i18n from '../../i18n'
import { staffApi, staffGameContentApi } from '../../services/api'
import { AdminGameContentPage } from './AdminGameContentPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../services/domain/staff.service', () => ({
  staffApi: { autoconfigGames: vi.fn() },
}))
vi.mock('../../services/domain/staffGameContent.service', () => ({
  staffGameContentApi: {
    configs: vi.fn(),
    saveConfig: vi.fn(),
  },
}))

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('pt')
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><AdminGameContentPage /></MemoryRouter></QueryClientProvider>)
  return client
}

beforeEach(() => {
  vi.mocked(staffGameContentApi.configs).mockImplementation(async (section: string) => {
    if (section === 'seasons') {
      return [{
        id: 's1', name: 'Temporada 1', starts_at: '2026-08-30T23:08:17Z', ends_at: '2026-11-29T23:08:17Z',
        premium_price: 50, active: true,
      }]
    }
    return []
  })
  vi.mocked(staffApi.autoconfigGames).mockResolvedValue({
    games: [{
      code: 'battle_pass',
      name: 'Passe de Batalha',
      activated: true,
      created: { season: 0, levels: 27, rewards: 63, quests: 11, exchanges: 4, milestones: 3 },
    }],
  })
})

it('mostra temporadas em cartões densos com metadados e status', async () => {
  const client = renderPage()
  expect(await screen.findByRole('heading', { name: 'Temporada 1' })).toBeVisible()
  expect(screen.getByText('Ativo')).toBeVisible()
  expect(screen.getByText('Início')).toBeVisible()
  expect(screen.getByText('Preço premium')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Editar' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Preencher passe low rate' })).toBeVisible()
  expect(screen.queryByText(/^Ativo:/)).not.toBeInTheDocument()
  client.clear()
})

it('traduz seções, rótulos de campo e status quando o idioma é inglês', async () => {
  await i18n.changeLanguage('en')
  const client = renderPage()
  expect(await screen.findByRole('heading', { name: 'Temporada 1' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Battle pass seasons' })).toBeVisible()
  expect(screen.getByLabelText('Configuration area')).toBeVisible()
  expect(screen.getByText('Premium price')).toBeVisible()
  expect(screen.getByText('Active')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Fill low-rate battle pass' })).toBeVisible()
  expect(screen.queryByText('Preço premium')).not.toBeInTheDocument()
  client.clear()
})

it('traduz as opções de objetivo e repetição no editor de missões', async () => {
  await i18n.changeLanguage('en')
  const user = userEvent.setup()
  const client = renderPage()
  await user.selectOptions(await screen.findByLabelText('Configuration area'), 'quests')
  await user.click(screen.getByRole('button', { name: 'New record' }))
  expect(await screen.findByRole('option', { name: 'Spin the wheel' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Once per season' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Girar a roda' })).not.toBeInTheDocument()
  client.clear()
})

it('traduz métricas da caça do dia no editor', async () => {
  await i18n.changeLanguage('en')
  const user = userEvent.setup()
  const client = renderPage()
  await user.selectOptions(await screen.findByLabelText('Configuration area'), 'hunt-quests')
  await user.click(screen.getByRole('button', { name: 'New record' }))
  expect(await screen.findByRole('option', { name: 'Online time' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'PvP' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Tempo online' })).not.toBeInTheDocument()
  client.clear()
})

it('traduz a oficina de recompensas quando o idioma é espanhol', async () => {
  await i18n.changeLanguage('es')
  const client = renderPage()
  expect(await screen.findByRole('heading', { name: 'Temporada 1' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Temporadas del pase' })).toBeVisible()
  expect(screen.getByText('Precio premium')).toBeVisible()
  expect(screen.getByText('Activo')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Rellenar pase low rate' })).toBeVisible()
  expect(screen.queryByText('Preço premium')).not.toBeInTheDocument()
  client.clear()
})

it('preenche o passe low rate e bloqueia clique duplicado', async () => {
  let resolveFn: (value: {
    games: Array<{ code: string; name: string; activated: boolean; created: Record<string, number> }>
  }) => void = () => {}
  const pending = new Promise<{
    games: Array<{ code: string; name: string; activated: boolean; created: Record<string, number> }>
  }>((resolve) => {
    resolveFn = resolve
  })
  vi.mocked(staffApi.autoconfigGames).mockReturnValue(pending)
  const user = userEvent.setup()
  const client = renderPage()
  const fill = await screen.findByRole('button', { name: 'Preencher passe low rate' })
  await user.click(fill)
  await user.click(fill)
  expect(staffApi.autoconfigGames).toHaveBeenCalledTimes(1)
  expect(staffApi.autoconfigGames).toHaveBeenCalledWith('battle_pass')
  expect(screen.getByRole('button', { name: 'Preenchendo passe...' })).toBeDisabled()
  resolveFn({
    games: [{
      code: 'battle_pass',
      name: 'Passe de Batalha',
      activated: true,
      created: { levels: 27, quests: 11 },
    }],
  })
  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith('Passe low rate aplicado (27 níveis e 11 missões novas)'),
  )
  client.clear()
})
