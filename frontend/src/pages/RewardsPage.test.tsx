// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { gamesApi, programsApi } from '../services/api'
import i18n from '../i18n'
import { RewardsPage } from './RewardsPage'

vi.mock('../components/ItemIcon', () => ({ ItemIcon: () => null }))
vi.mock('../services/domain/programs.service', () => ({ programsApi: { resources: vi.fn() } }))
vi.mock('../services/domain/games.service', () => ({
  gamesApi: {
    battlePass: vi.fn(),
    battleDetails: vi.fn(),
    battleAction: vi.fn(),
    claimBattlePass: vi.fn(),
    buyBattlePassPremium: vi.fn(),
    dailyDetails: vi.fn(),
    dailyBonus: vi.fn(),
    claimDailyBonus: vi.fn(),
    stats: vi.fn(),
    hunt: vi.fn(),
    claimHunt: vi.fn(),
  },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const season = { id: 's1', name: 'Temporada 1', premium_price: '50', ends_at: '2026-11-29T23:59:00Z' }
const pass = {
  season,
  xp: 120,
  has_premium: false,
  current_level: 1,
  levels: [
    {
      level: 1,
      required_xp: 100,
      unlocked: true,
      rewards: [
        { id: 'free-1', is_premium: false, item_id: 57, item_name: 'Adena', quantity: 500, description: 'Moedas do reino', claimed: false, locked_premium: false },
        { id: 'premium-1', is_premium: true, item_id: 3470, item_name: 'Manto', quantity: 1, description: 'Manto premium', claimed: false, locked_premium: true },
      ],
    },
    {
      level: 2,
      required_xp: 400,
      unlocked: false,
      rewards: [
        { id: 'free-2', is_premium: false, item_id: 57, item_name: 'Adena', quantity: 900, description: 'Moedas do reino', claimed: false, locked_premium: false },
      ],
    },
  ],
}
const details = {
  auto_claim: false,
  statistics: { quests: 3, rewards: 2, exchanges: 1 },
  history: [{ id: 'h1', label: 'Nível 1 resgatado', created_at: '2026-09-10T12:00:00Z', rewards: [{ kind: 'item', quantity: 500, item_id: 57, name: 'Adena' }] }],
  quests: [
    { id: 'q-done', name: 'Caçar 10 lobos', description: 'Explore a floresta', period: 'daily', target: 10, current: 10, xp: 40, claimed: false },
    { id: 'q-open', name: 'Pescar 5 peixes', description: 'Visite o lago', period: 'weekly', target: 5, current: 2, xp: 25, claimed: false },
  ],
  exchanges: [
    { id: 'x-ok', name: 'Troca do ferreiro', required_item_id: 57, required_enchant: 0, required_quantity: 2, owned: 4, limit: 3, used: 1, rewards: [{ kind: 'item', quantity: 1, item_id: 3470, name: 'Manto' }] },
    { id: 'x-missing', name: 'Troca do alquimista', required_item_id: 99, required_enchant: 3, required_quantity: 5, owned: 1, limit: 0, used: 0, rewards: [{ kind: 'item', quantity: 1, item_id: 728, name: 'Poção' }] },
  ],
  milestones: [
    { id: 'm-ok', name: 'Marco inicial', required_xp: 100, claimed: false, rewards: [{ kind: 'item', quantity: 1, item_id: 57, name: 'Adena' }] },
    { id: 'm-far', name: 'Marco final', required_xp: 900, claimed: false, rewards: [{ kind: 'item', quantity: 1, item_id: 57, name: 'Adena' }] },
  ],
}
const daily = {
  season: { id: 'd1', name: 'Calendário de setembro', ends_on: '2026-09-30', current_day: 2 },
  claimed: false,
  days: [
    { day: 1, rewards: [{ kind: 'item', quantity: 100, item_id: 57, name: 'Adena' }] },
    { day: 2, rewards: [{ kind: 'item', quantity: 200, item_id: 57, name: 'Adena' }] },
    { day: 3, rewards: [] },
  ],
  pool: [
    { name: 'Bolsa comum', weight: 3, rewards: [{ kind: 'item', quantity: 1, item_id: 57, name: 'Adena' }] },
    { name: 'Bolsa rara', weight: 1, rewards: [{ kind: 'item', quantity: 1, item_id: 3470, name: 'Manto' }] },
  ],
  history: [],
}
const hunt = {
  character: {
    login: 'hunter',
    char_id: 7,
    name: 'Caçador',
    level: 80,
    pvp: 12,
    pk: 1,
    online_time: 3600,
    online: false,
  },
  characters: [{ login: 'hunter', char_id: 7, name: 'Caçador', level: 80, online: false }],
  quests: [
    {
      id: 'q-pvp',
      name: 'Caçada PvP',
      description: 'Vença 10 PvPs',
      metric: 'pvp',
      target: 10,
      current: 10,
      period: 'daily',
      claimed: false,
      rewards: [{ kind: 'tokens', quantity: 5, name: 'Fichas' }],
    },
    {
      id: 'q-online',
      name: 'Tempo no reino',
      description: 'Fique 1 hora online',
      metric: 'online_time',
      target: 3600,
      current: 120,
      period: 'daily',
      claimed: false,
      rewards: [{ kind: 'item', quantity: 1000, item_id: 57, name: 'Adena' }],
    },
  ],
}
const stats = {
  plays: 20,
  wins: 5,
  payout: 0,
  leaderboard: [
    { username: 'denky', score: 30, wins: 12 },
    { username: 'aria', score: 22, wins: 9 },
  ],
}

let client: QueryClient

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(programsApi.resources).mockResolvedValue([])
  vi.mocked(gamesApi.battlePass).mockResolvedValue(pass as Awaited<ReturnType<typeof gamesApi.battlePass>>)
  vi.mocked(gamesApi.battleDetails).mockResolvedValue(details as Awaited<ReturnType<typeof gamesApi.battleDetails>>)
  vi.mocked(gamesApi.battleAction).mockResolvedValue(details as Awaited<ReturnType<typeof gamesApi.battleAction>>)
  vi.mocked(gamesApi.claimBattlePass).mockResolvedValue({ item_name: 'Adena' } as Awaited<ReturnType<typeof gamesApi.claimBattlePass>>)
  vi.mocked(gamesApi.buyBattlePassPremium).mockResolvedValue({} as Awaited<ReturnType<typeof gamesApi.buyBattlePassPremium>>)
  vi.mocked(gamesApi.dailyDetails).mockResolvedValue(daily as Awaited<ReturnType<typeof gamesApi.dailyDetails>>)
  vi.mocked(gamesApi.dailyBonus).mockResolvedValue({ amount: '10', active: true, claimed: false } as Awaited<ReturnType<typeof gamesApi.dailyBonus>>)
  vi.mocked(gamesApi.claimDailyBonus).mockResolvedValue({ amount: '10', active: true, claimed: true } as Awaited<ReturnType<typeof gamesApi.claimDailyBonus>>)
  vi.mocked(gamesApi.stats).mockResolvedValue(stats)
  vi.mocked(gamesApi.hunt).mockResolvedValue(hunt as Awaited<ReturnType<typeof gamesApi.hunt>>)
  vi.mocked(gamesApi.claimHunt).mockResolvedValue({
    ...hunt,
    quests: hunt.quests.map((quest) => quest.id === 'q-pvp' ? { ...quest, claimed: true } : quest),
  } as Awaited<ReturnType<typeof gamesApi.claimHunt>>)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(async () => {
  cleanup()
  client.clear()
  await i18n.changeLanguage('pt')
})

function mount(path = '/panel/rewards') {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}><RewardsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

it('apresenta a temporada com progresso, atalho do salão de jogos e abas da jornada', async () => {
  mount()
  expect(screen.getByRole('heading', { level: 1, name: 'Jornada e recompensas' })).toBeVisible()
  expect(screen.getByRole('link', { name: /salão de jogos/i })).toHaveAttribute('href', '/panel/games')
  expect(await screen.findByRole('heading', { name: 'Temporada 1' })).toBeVisible()
  expect(screen.getByText('120 XP')).toBeVisible()
  expect(screen.getByText('Prêmios resgatados')).toBeVisible()
  expect(screen.getByText('0/3')).toBeVisible()
  expect(screen.getByText('Próximo nível: 2')).toBeVisible()
  const seasonBar = screen.getByRole('progressbar', { name: 'Progresso da temporada' })
  expect(seasonBar).toHaveAttribute('aria-valuenow', '120')
  expect(seasonBar).toHaveAttribute('aria-valuemax', '400')
  expect(screen.getByRole('tab', { name: 'Passe de batalha', selected: true })).toBeVisible()
})

it('resgata a missão concluída e bloqueia a missão em andamento', async () => {
  const user = mount()
  const done = within((await screen.findByText('Caçar 10 lobos')).closest('article')!)
  expect(done.getByRole('progressbar', { name: 'Caçar 10 lobos' })).toHaveAttribute('aria-valuenow', '10')
  const open = within(screen.getByText('Pescar 5 peixes').closest('article')!)
  expect(open.getByRole('button', { name: 'Resgatar XP' })).toBeDisabled()
  await user.click(done.getByRole('button', { name: 'Resgatar XP' }))
  expect(gamesApi.battleAction).toHaveBeenCalledWith('quest', 'q-done')
  expect(toast.success).toHaveBeenCalledWith('Experiência recebida.')
})

it('resgata o prêmio gratuito e mantém o prêmio premium bloqueado na trilha de níveis', async () => {
  const user = mount()
  await user.click(await screen.findByRole('tab', { name: 'Prêmios por nível' }))
  expect(screen.getByText('Trilha gratuita')).toBeVisible()
  const premium = screen.getByText('Manto × 1').closest('.pass-reward')!
  expect(within(premium as HTMLElement).getByText('Requer premium')).toBeVisible()
  expect(within(premium as HTMLElement).queryByRole('button')).not.toBeInTheDocument()
  const locked = screen.getByText('Adena × 900').closest('.pass-reward')!
  expect(within(locked as HTMLElement).getByText('Nível bloqueado')).toBeVisible()
  const available = screen.getByText('Adena × 500').closest('.pass-reward')!
  await user.click(within(available as HTMLElement).getByRole('button', { name: 'Resgatar' }))
  expect(gamesApi.claimBattlePass).toHaveBeenCalledWith('free-1')
  expect(toast.success).toHaveBeenCalledWith('Prêmio entregue na bag.')
})

it('troca somente com estoque suficiente e informa a falta de itens', async () => {
  const user = mount()
  await user.click(await screen.findByRole('tab', { name: 'Trocas' }))
  const ok = within(screen.getByText('Troca do ferreiro').closest('article')!)
  expect(ok.getByText('4 / 2 na bag')).toBeVisible()
  expect(ok.getByText('Trocas 1 / 3')).toBeVisible()
  const missing = within(screen.getByText('Troca do alquimista').closest('article')!)
  expect(missing.getByRole('button', { name: 'Trocar itens' })).toBeDisabled()
  await user.click(ok.getByRole('button', { name: 'Trocar itens' }))
  expect(gamesApi.battleAction).toHaveBeenCalledWith('exchange', 'x-ok')
  expect(toast.success).toHaveBeenCalledWith('Troca concluída.')
})

it('resgata o marco alcançado e bloqueia o marco distante', async () => {
  const user = mount()
  await user.click(await screen.findByRole('tab', { name: 'Marcos' }))
  const far = within(screen.getByText('Marco final').closest('article')!)
  expect(far.getByRole('button', { name: 'Resgatar marco' })).toBeDisabled()
  expect(far.getByRole('progressbar', { name: 'Marco final' })).toHaveAttribute('aria-valuenow', '120')
  const reached = within(screen.getByText('Marco inicial').closest('article')!)
  await user.click(reached.getByRole('button', { name: 'Resgatar marco' }))
  expect(gamesApi.battleAction).toHaveBeenCalledWith('milestone', 'm-ok')
  expect(toast.success).toHaveBeenCalledWith('Marco resgatado.')
})

it('ativa o resgate automático e compra o passe premium', async () => {
  const user = mount()
  await user.click(await screen.findByRole('checkbox', { name: /Resgatar automaticamente/ }))
  expect(gamesApi.battleAction).toHaveBeenCalledWith('auto-claim', undefined, true)
  await user.click(screen.getByRole('button', { name: /Premium · 50 moedas/ }))
  expect(gamesApi.buyBattlePassPremium).toHaveBeenCalledTimes(1)
  expect(toast.success).toHaveBeenCalledWith('Passe premium ativado.')
})

it('mostra o passe premium ativo sem oferecer a compra', async () => {
  vi.mocked(gamesApi.battlePass).mockResolvedValue({ ...pass, has_premium: true } as Awaited<ReturnType<typeof gamesApi.battlePass>>)
  mount()
  expect(await screen.findByText('Passe premium ativo')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Premium ·/ })).not.toBeInTheDocument()
})

it('sem temporada ativa apresenta o aviso e o histórico da conta', async () => {
  vi.mocked(gamesApi.battlePass).mockResolvedValue({ ...pass, season: null, levels: [] } as Awaited<ReturnType<typeof gamesApi.battlePass>>)
  mount()
  expect(await screen.findByText('A próxima temporada está sendo preparada. Volte em breve.')).toBeVisible()
  expect(screen.getByText('Nível 1 resgatado')).toBeVisible()
  expect(screen.queryByRole('tab', { name: 'Missões' })).not.toBeInTheDocument()
})

it('falha ao carregar o passe é apresentada ao jogador', async () => {
  vi.mocked(gamesApi.battlePass).mockRejectedValue(new Error('Passe indisponível'))
  mount()
  expect(await screen.findByRole('alert')).toHaveTextContent('Passe indisponível')
})

it('recurso pausado substitui o passe pelo aviso do painel', async () => {
  vi.mocked(programsApi.resources).mockResolvedValue([{ code: 'battle-pass', enabled: false }] as Awaited<ReturnType<typeof programsApi.resources>>)
  mount()
  expect(await screen.findByRole('heading', { name: 'Recurso temporariamente desativado' })).toBeVisible()
  expect(gamesApi.battlePass).not.toHaveBeenCalled()
})

it('bônus diário apresenta calendário por estado e resgata a recompensa do dia', async () => {
  const user = mount('/panel/rewards?tab=daily')
  expect(await screen.findByRole('heading', { name: 'Calendário de setembro' })).toBeVisible()
  expect(screen.getByText('Dia 2 de 3')).toBeVisible()
  expect(within(screen.getByText('Dia 1').closest('article')!).getByText('Liberado')).toBeVisible()
  expect(within(screen.getByText('Dia 2').closest('article')!).getByText('Hoje')).toBeVisible()
  const locked = within(screen.getByText('Dia 3').closest('article')!)
  expect(locked.getByText('Bloqueado')).toBeVisible()
  expect(locked.getByText('Sem prêmio configurado')).toBeVisible()
  expect(screen.getByText('Chance: 75.0%')).toBeVisible()
  await user.click(screen.getByRole('button', { name: /Resgatar recompensa de hoje/ }))
  expect(gamesApi.claimDailyBonus).toHaveBeenCalledTimes(1)
  expect(toast.success).toHaveBeenCalledWith('Recompensa diária recebida.')
})

it('bônus diário já resgatado não permite novo envio', async () => {
  vi.mocked(gamesApi.dailyDetails).mockResolvedValue({ ...daily, claimed: true } as Awaited<ReturnType<typeof gamesApi.dailyDetails>>)
  mount('/panel/rewards?tab=daily')
  expect(await screen.findByRole('button', { name: /Recompensa de hoje resgatada/ })).toBeDisabled()
  expect(gamesApi.claimDailyBonus).not.toHaveBeenCalled()
})

it('caça do dia resgata a missão concluída e bloqueia a incompleta', async () => {
  const user = mount('/panel/rewards?tab=hunt')
  expect(await screen.findByRole('heading', { name: 'Caça do dia' })).toBeVisible()
  expect(screen.getByLabelText('Personagem')).toBeVisible()
  const done = within(screen.getByText('Caçada PvP').closest('.battle-pass-card')!)
  const open = within(screen.getByText('Tempo no reino').closest('.battle-pass-card')!)
  expect(open.getByRole('button', { name: 'Resgatar' })).toBeDisabled()
  await user.click(done.getByRole('button', { name: 'Resgatar' }))
  expect(gamesApi.claimHunt).toHaveBeenCalledWith('q-pvp', 'hunter', 7)
  expect(toast.success).toHaveBeenCalledWith('Caça resgatada')
})

it('caça já resgatada não permite novo envio', async () => {
  vi.mocked(gamesApi.hunt).mockResolvedValue({
    ...hunt,
    quests: hunt.quests.map((quest) => ({ ...quest, claimed: true })),
  } as Awaited<ReturnType<typeof gamesApi.hunt>>)
  mount('/panel/rewards?tab=hunt')
  expect(await screen.findAllByRole('button', { name: 'Resgatado' })).toHaveLength(2)
  expect(screen.getAllByRole('button', { name: 'Resgatado' })[0]).toBeDisabled()
  expect(gamesApi.claimHunt).not.toHaveBeenCalled()
})

it('caça recarrega o personagem escolhido na lista', async () => {
  vi.mocked(gamesApi.hunt).mockImplementation(async (login?: string, charId?: number) => {
    if (login === 'alt' && charId === 9) {
      return {
        ...hunt,
        character: { ...hunt.character, login: 'alt', char_id: 9, name: 'Outro' },
        characters: [
          hunt.characters[0],
          { login: 'alt', char_id: 9, name: 'Outro', level: 40, online: false },
        ],
      } as Awaited<ReturnType<typeof gamesApi.hunt>>
    }
    return {
      ...hunt,
      characters: [
        hunt.characters[0],
        { login: 'alt', char_id: 9, name: 'Outro', level: 40, online: false },
      ],
    } as Awaited<ReturnType<typeof gamesApi.hunt>>
  })
  const user = mount('/panel/rewards?tab=hunt')
  await screen.findByRole('heading', { name: 'Caça do dia' })
  await user.selectOptions(screen.getByLabelText('Personagem'), 'alt:9')
  await waitFor(() => expect(gamesApi.hunt).toHaveBeenCalledWith('alt', 9))
})

it('recurso de caça pausado substitui as missões pelo aviso', async () => {
  vi.mocked(programsApi.resources).mockResolvedValue([{ code: 'hunt', enabled: false }] as Awaited<ReturnType<typeof programsApi.resources>>)
  mount('/panel/rewards?tab=hunt')
  expect(await screen.findByRole('heading', { name: 'Recurso temporariamente desativado' })).toBeVisible()
  expect(gamesApi.hunt).not.toHaveBeenCalled()
})

it('estatísticas mostram desempenho, pódio e trocam de jogo', async () => {
  const user = mount('/panel/rewards?tab=statistics')
  expect(await screen.findAllByText('25.0%')).toHaveLength(3)
  expect(screen.getByRole('progressbar', { name: 'Taxa de sucesso' })).toHaveAttribute('aria-valuenow', '25')
  const table = screen.getByRole('table', { name: 'Ranking de desempenho' })
  expect(within(table).getAllByRole('row')).toHaveLength(3)
  expect(within(table).getByText('denky')).toBeVisible()
  expect(gamesApi.stats).toHaveBeenCalledWith('roulette')
  await user.click(screen.getByRole('tab', { name: 'Mesa da Taverna' }))
  expect(gamesApi.stats).toHaveBeenCalledWith('dice')
})

it('ranking sem partidas apresenta o estado vazio', async () => {
  vi.mocked(gamesApi.stats).mockResolvedValue({ ...stats, plays: 0, wins: 0, leaderboard: [] })
  mount('/panel/rewards?tab=statistics')
  expect(await screen.findByText('A primeira partida começa este ranking.')).toBeVisible()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})

it('a jornada acompanha o idioma ativo', async () => {
  await i18n.changeLanguage('en')
  mount()
  expect(screen.getByRole('heading', { level: 1, name: 'Journey and rewards' })).toBeVisible()
  expect(await screen.findByText('Prizes claimed')).toBeVisible()
  expect(screen.getByRole('tab', { name: 'Daily bonus' })).toBeVisible()
  expect(screen.queryByText('Passe de batalha')).not.toBeInTheDocument()
})
