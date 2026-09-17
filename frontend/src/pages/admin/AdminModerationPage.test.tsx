// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import i18n from '../../i18n'
import { staffModerationApi, type ApiModerationActionResult, type ApiModerationCharacter } from '../../services/api'
import { AdminModerationPage } from './AdminModerationPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../services/domain/staffModeration.service', () => ({
  staffModerationApi: { characters: vi.fn(), character: vi.fn(), act: vi.fn() },
}))

const hero: ApiModerationCharacter = {
  char_id: 7,
  name: 'SirHero',
  login: 'hero',
  email: 'hero@pdl.dev',
  level: 70,
  online: true,
  sex: 0,
  class_id: 0,
  title: '',
  clan_name: 'Aden',
  pvp: 12,
  pk: 1,
  karma: 0,
  online_time: 3600,
  last_access: 1_700_000_000_000,
  account_access: 0,
  char_access: 0,
  x: 83400,
  y: 147943,
  z: -3404,
  linked_user_id: null,
  panel_username: 'Owner',
  banned: false,
  jailed: false,
  jail_until: null,
  jail_reason: '',
  logs: [],
  towns: [{ id: 'giran', x: 83400, y: 147943, z: -3404 }, { id: 'aden', x: 1, y: 2, z: 3 }],
}

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AdminModerationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(async () => {
  vi.resetAllMocks()
  await i18n.changeLanguage('pt')
  vi.mocked(staffModerationApi.characters).mockResolvedValue({
    available: true,
    results: [hero],
    count: 1,
    page: 1,
    pages: 1,
    towns: hero.towns ?? [],
  })
  vi.mocked(staffModerationApi.character).mockResolvedValue(hero)
  vi.mocked(staffModerationApi.act).mockResolvedValue({
    action: 'kick',
    was_online: true,
    takes_effect: 'next_login',
    character: { ...hero, online: false },
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('lista personagens e mostra ações ao escolher um', async () => {
  const user = mount()
  expect(await screen.findByRole('heading', { name: 'Moderação' })).toBeVisible()
  expect(await screen.findByText('SirHero')).toBeVisible()
  expect(screen.getByText('hero@pdl.dev')).toBeVisible()
  await user.click(screen.getByRole('button', { name: /SirHero/i }))
  expect(await screen.findByRole('button', { name: 'Kick' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Prender' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Banir' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Teleportar' })).toBeVisible()
  expect(screen.getByText('Owner')).toBeVisible()
})

it('busca pelo nick e aplica kick com aviso de personagem online', async () => {
  const user = mount()
  await screen.findByText('SirHero')
  await user.type(screen.getByLabelText('Nick, conta ou e-mail'), 'Sir')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(staffModerationApi.characters).toHaveBeenCalledWith('Sir', 'all', 1))
  await user.click(screen.getByRole('button', { name: /SirHero/i }))
  await user.click(await screen.findByRole('button', { name: 'Kick' }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'Kick' }))
  await waitFor(() => expect(staffModerationApi.act).toHaveBeenCalledWith({
    action: 'kick',
    char_id: 7,
    reason: '',
    minutes: undefined,
    town: undefined,
  }))
  expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Kick aplicado/))
})

it('prisão exige motivo e bloqueia envio duplicado', async () => {
  let release: ((value: ApiModerationActionResult) => void) | undefined
  vi.mocked(staffModerationApi.act).mockImplementation(
    () => new Promise<ApiModerationActionResult>((resolve) => { release = resolve }),
  )
  const user = mount()
  await screen.findByText('SirHero')
  await user.click(screen.getByRole('button', { name: /SirHero/i }))
  await user.click(await screen.findByRole('button', { name: 'Prender' }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'Prender' }))
  expect(staffModerationApi.act).not.toHaveBeenCalled()
  await user.type(within(dialog).getByLabelText(/Motivo/), 'RMT')
  await user.click(within(dialog).getByRole('button', { name: 'Prender' }))
  expect(staffModerationApi.act).toHaveBeenCalledTimes(1)
  expect(staffModerationApi.act).toHaveBeenCalledWith({
    action: 'jail',
    char_id: 7,
    reason: 'RMT',
    minutes: 0,
    town: undefined,
  })
  const applying = await waitFor(() => within(dialog).getByRole('button', { name: 'Aplicando...' }))
  expect(applying).toBeDisabled()
  await user.click(applying)
  expect(staffModerationApi.act).toHaveBeenCalledTimes(1)
  release?.({ action: 'jail', was_online: true, takes_effect: 'next_login', character: { ...hero, jailed: true } })
})

it('mostra estado vazio e erro de listagem', async () => {
  vi.mocked(staffModerationApi.characters).mockResolvedValue({
    available: true, results: [], count: 0, page: 1, pages: 1, towns: [],
  })
  mount()
  expect(await screen.findByText('Nenhum personagem encontrado com esses filtros.')).toBeVisible()
  expect(screen.getByText('Escolha um personagem na lista para ver as ações.')).toBeVisible()

  cleanup()
  vi.mocked(staffModerationApi.characters).mockRejectedValue({ status: 500 })
  mount()
  expect(await screen.findByText('Não foi possível listar os personagens')).toBeVisible()
})

it('informa quando a moderação pelo jogo não está disponível', async () => {
  vi.mocked(staffModerationApi.characters).mockResolvedValue({
    available: false, results: [], count: 0, page: 1, pages: 1, towns: [],
  })
  mount()
  expect(await screen.findByText('A moderação pelo banco do jogo não está disponível neste servidor.')).toBeVisible()
})

it('traduz a tela no idioma ativo', async () => {
  await i18n.changeLanguage('en')
  mount()
  expect(await screen.findByRole('heading', { name: 'Moderation' })).toBeVisible()
  expect(await screen.findByRole('button', { name: 'Search' })).toBeVisible()
  expect(screen.queryByText('Encontrar personagem')).not.toBeInTheDocument()
})
