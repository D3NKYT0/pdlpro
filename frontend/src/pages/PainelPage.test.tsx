// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { authApi, gamesApi, lineageApi, programsApi, serverApi, walletApi } from '../services/api'
import i18n from '../i18n'
import { PainelPage } from './PainelPage'

const session = vi.hoisted(() => ({
  user: { id: 'u1', username: 'denky', display_name: 'Denky', fichas: 8, is_email_verified: true, is_2fa_enabled: false },
  refreshUser: vi.fn(),
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('../services/domain/programs.service', () => ({ programsApi: { resources: vi.fn() } }))
vi.mock('../services/domain/server.service', () => ({ serverApi: { status: vi.fn() } }))
vi.mock('../services/domain/wallet.service', () => ({ walletApi: { me: vi.fn() } }))
vi.mock('../services/domain/lineage.service', async original => ({
  ...await original<object>(),
  lineageApi: { accounts: vi.fn(), characters: vi.fn() },
}))
vi.mock('../services/domain/games.service', async original => ({
  ...await original<object>(),
  gamesApi: { bag: vi.fn() },
}))
vi.mock('../services/domain/auth.service', async original => ({
  ...await original<object>(),
  authApi: { progress: vi.fn(), claimReward: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const profile = {
  xp: 50,
  level: 3,
  xp_next: 100,
  unlocked_now: [],
  unlocked_count: 1,
  total_achievements: 1,
  achievements: [{ code: 'a1', name: 'Primeira jornada', description: 'Entrou no painel', unlocked: true }],
  rewards: [{
    id: 'r1',
    kind: 'level',
    reference: '2',
    description: 'Nível 2',
    item_id: 57,
    item_name: 'Adena',
    quantity: 100,
    claimed: false,
    available: true,
  }],
}

let client: QueryClient

beforeEach(() => {
  vi.resetAllMocks()
  session.refreshUser.mockResolvedValue(undefined)
  vi.mocked(programsApi.resources).mockResolvedValue([])
  vi.mocked(serverApi.status).mockResolvedValue({ game_online: true, login_online: false, players_online: 42 })
  vi.mocked(authApi.progress).mockResolvedValue(profile)
  vi.mocked(walletApi.me).mockResolvedValue({ id: 'w1', balance: '12.50', bonus_balance: '1.00' })
  vi.mocked(lineageApi.accounts).mockResolvedValue({
    accounts: [{ login: 'denky', is_primary: true, linked: true }],
    slots: { used: 1, total: 3, can_link: true },
    primary: { login: 'denky', status: 'owned' },
  })
  vi.mocked(lineageApi.characters).mockResolvedValue([
    {
      char_id: 7,
      name: 'SirDenky',
      level: 80,
      online: true,
      sex: 0,
      pvp: 0,
      pk: 0,
      class_id: 88,
      title: '',
      clan_name: '',
      is_clan_leader: false,
      karma: 0,
      adena: 0,
      online_time: 0,
      last_access: 0,
      clan_id: 0,
      ally_id: 0,
      ally_name: '',
      clan_crest_base64: '',
      ally_crest_base64: '',
    },
  ])
  vi.mocked(gamesApi.bag).mockResolvedValue([{ item_id: 57, item_name: 'Adena', quantity: 10, enchant: 0 }])
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(async () => {
  cleanup()
  client.clear()
  await i18n.changeLanguage('pt')
})

function mount() {
  return render(<QueryClientProvider client={client}><MemoryRouter><PainelPage /></MemoryRouter></QueryClientProvider>)
}

it('apresenta saudação, status do servidor e atalhos habilitados', async () => {
  mount()
  expect(screen.getByRole('heading', { name: 'Olá, Denky' })).toBeVisible()
  expect(screen.getByText('Jogadores online')).toBeVisible()
  expect(await screen.findByText('42')).toBeVisible()
  expect(screen.getAllByText('Online').length).toBeGreaterThan(0)
  expect(screen.getByText('Offline')).toBeVisible()
  expect(screen.getByRole('link', { name: /Saldo, PIX/ })).toHaveAttribute('href', '/panel/wallet')
  expect(screen.queryByRole('link', { name: /Conquistas/ })).not.toBeInTheDocument()
})

it('mostra o resumo da conta, retrato do personagem e atalho do perfil', async () => {
  mount()
  expect(await screen.findByRole('region', { name: 'Resumo da conta' })).toBeVisible()
  expect(screen.getByRole('link', { name: /Abrir meu perfil/ })).toHaveAttribute('href', '/panel/profile')
  expect(await screen.findByText('12.50')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Seus personagens' })).toBeVisible()
  expect(await screen.findByText('SirDenky')).toBeVisible()
  expect(screen.getByRole('link', { name: /SirDenky/ })).toHaveAttribute('href', '/panel/accounts/denky/7')
})

it('mostra nível, prêmios da conta e conquistas no próprio painel', async () => {
  mount()
  expect(await screen.findByText('Adena × 100')).toBeVisible()
  expect(screen.getByText('100 XP para o próximo nível')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Seu progresso' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Conquistas' })).toBeVisible()
  expect(screen.getByText('Primeira jornada')).toBeVisible()
  expect(screen.queryByRole('link', { name: /Ver prêmios/ })).not.toBeInTheDocument()
})

it('distingue prêmio resgatado, disponível e bloqueado', async () => {
  vi.mocked(authApi.progress).mockResolvedValue({
    ...profile,
    rewards: [
      { ...profile.rewards[0], id: 'claimed', claimed: true, available: false },
      { ...profile.rewards[0], id: 'open', item_name: 'Soulshot', claimed: false, available: true },
      { ...profile.rewards[0], id: 'locked', item_name: 'Crystal', claimed: false, available: false },
    ],
  })
  mount()
  expect(await screen.findByText('Resgatada')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Resgatar' })).toBeVisible()
  expect(screen.getByText('Bloqueada')).toBeVisible()
})

it('mostra o estado vazio quando não há prêmio de evolução', async () => {
  vi.mocked(authApi.progress).mockResolvedValue({ ...profile, rewards: [] })
  mount()
  expect(await screen.findByText('Nenhuma recompensa disponível.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Resgatar' })).not.toBeInTheDocument()
})

it('avisa quando o resgate do prêmio falha', async () => {
  vi.mocked(authApi.claimReward).mockRejectedValue(new Error('Saldo indisponível'))
  const user = userEvent.setup()
  mount()
  await user.click(await screen.findByRole('button', { name: 'Resgatar' }))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não foi possível resgatar'))
})

it('resgata o prêmio disponível e bloqueia um segundo envio enquanto a ação corre', async () => {
  let finish: ((value: { claimed: boolean; item_name: string }) => void) | undefined
  vi.mocked(authApi.claimReward).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  const user = userEvent.setup()
  mount()
  const claim = await screen.findByRole('button', { name: 'Resgatar' })
  await user.click(claim)
  expect(claim).toBeDisabled()
  await user.click(claim)
  expect(authApi.claimReward).toHaveBeenCalledTimes(1)
  expect(authApi.claimReward).toHaveBeenCalledWith('r1')
  finish?.({ claimed: true, item_name: 'Adena' })
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Adena enviado à bag'))
  expect(session.refreshUser).toHaveBeenCalled()
})

it('esconde progresso e o atalho do recurso pausado', async () => {
  vi.mocked(programsApi.resources).mockResolvedValue([
    { code: 'wallet', enabled: false },
    { code: 'progress', enabled: false },
    { code: 'accounts', enabled: false },
    { code: 'games', enabled: false },
  ] as Awaited<ReturnType<typeof programsApi.resources>>)
  mount()
  await waitFor(() => expect(screen.queryByRole('link', { name: /Saldo, PIX/ })).not.toBeInTheDocument())
  expect(screen.getByRole('link', { name: /Avatar, nome/ })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Seu progresso' })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Conquistas' })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Seus personagens' })).not.toBeInTheDocument()
})

it('traduz saudação, status e atalhos no idioma ativo', async () => {
  await i18n.changeLanguage('en')
  mount()
  expect(screen.getByRole('heading', { name: 'Hello, Denky' })).toBeVisible()
  expect(screen.getByText('Account overview')).toBeVisible()
  expect(await screen.findByText('Players online')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Continue your adventure' })).toBeVisible()
  expect(screen.getByText('Balance, PIX and transfers')).toBeVisible()
  expect(await screen.findByRole('heading', { name: 'Your progress' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Account summary' })).toBeVisible()
})
