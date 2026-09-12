// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { ApiError, gamesApi } from '../services/api'
import { GamesPage } from './GamesPage'

vi.mock('../components/ItemIcon', () => ({ ItemIcon: () => null }))
vi.mock('../services/domain/games.service', () => ({ gamesApi: Object.fromEntries(['roulette', 'dailyBonus', 'boxes', 'minigames', 'economy', 'spin', 'buyTokens', 'claimDailyBonus', 'buyBox', 'openBox', 'dice', 'slots', 'fight', 'enchant'].map(name => [name, vi.fn()])) }))
const rouletteReveal = vi.hoisted(() => {
  let slowMs = 60_000
  let wait = () => Promise.resolve()
  return {
    getSlowMs: () => slowMs,
    setSlowMs: (value: number) => {
      slowMs = value
    },
    wait: () => wait(),
    reset: () => {
      slowMs = 60_000
      wait = () => Promise.resolve()
    },
  }
})
vi.mock('../components/games/rouletteReveal', () => ({
  ROULETTE_REVEAL_MS: 0,
  get ROULETTE_SLOW_MS() {
    return rouletteReveal.getSlowMs()
  },
  waitForRouletteReveal: () => rouletteReveal.wait(),
}))
const boxReveal = vi.hoisted(() => {
  let shake = () => Promise.resolve()
  let wait = () => Promise.resolve()
  return {
    shake: () => shake(),
    wait: () => wait(),
    setShake: (value: () => Promise<void>) => {
      shake = value
    },
    setWait: (value: () => Promise<void>) => {
      wait = value
    },
    reset: () => {
      shake = () => Promise.resolve()
      wait = () => Promise.resolve()
    },
  }
})
vi.mock('../components/games/boxReveal', () => ({
  BOX_SHAKE_MS: 0,
  BOX_OVERLAY_MS: 0,
  BOX_REVEAL_MS: 0,
  waitForBoxShake: () => boxReveal.shake(),
  waitForBoxReveal: () => boxReveal.wait(),
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let client: QueryClient
beforeEach(() => {
  rouletteReveal.reset()
  boxReveal.reset()
  vi.resetAllMocks()
  vi.mocked(gamesApi.roulette).mockResolvedValue({
    fichas: 10,
    cost: 1,
    fail_chance: 20,
    prizes: [{ id: 'p1', name: 'Adena', rarity: 'comum', item_id: 57, weight: 10, quantity: 50000 }],
  } as any)
  vi.mocked(gamesApi.dailyBonus).mockResolvedValue({ claimed: false, amount: '5.00' } as any)
  vi.mocked(gamesApi.boxes).mockResolvedValue({
    types: [{
      id: 'type',
      name: 'Caixa rara',
      price: '10.00',
      boosters_amount: 2,
      featured: { name: 'Enchant Weapon C', item_id: 951, quantity: 1 },
      items: [{ name: 'Adena', item_id: 57, quantity: 80000 }],
    }],
    boxes: [{
      id: 'box',
      type_id: 'owned-type',
      type_name: 'Caixa adquirida',
      remaining: 1,
      total: 2,
      featured: { name: 'Enchant Weapon C', item_id: 951, quantity: 1 },
    }],
  })
  vi.mocked(gamesApi.minigames).mockResolvedValue({ fichas: 10, dice: { active: true, min_bet: 1 }, slots: { active: true, cost: 1, symbols: ['A'] } })
  vi.mocked(gamesApi.economy).mockResolvedValue({ fichas: 10, weapon: { level: 3, fragments: 10 }, monsters: [{ id: 'monster', name: 'Orc', alive: true, level: 1, required_weapon_level: 1, fragment_reward: 2, respawn_in: 0 }, { id: 'resting', name: 'Troll', alive: false, level: 2, required_weapon_level: 2, fragment_reward: 3, respawn_in: 60 }] })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear() })
function mount(tab: string) {
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/panel/games?tab=${tab}`]}><GamesPage /></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
const actions = [
  { method: 'buyTokens', tab: 'roulette', button: 'Comprar', args: [5], result: { fichas: 15 }, message: 'Fichas creditadas' },
  { method: 'claimDailyBonus', tab: 'roulette', button: 'Resgatar bônus', args: [], result: { amount: '5.00', claimed: true }, message: 'Bônus de R$ 5.00 creditado' },
  { method: 'buyBox', tab: 'boxes', button: 'Comprar', args: ['type'], result: { id: 'new-box', remaining: 2 }, message: 'Caixa comprada' },
  { method: 'openBox', tab: 'boxes', button: 'Abrir · 1 ficha', args: ['box'], result: { item: { name: 'Espada', enchant: 3 }, remaining: 0 }, message: 'Espada (+3)' },
  { method: 'dice', tab: 'chance', button: 'Lançar os dados', args: [{ bet_type: 'even', amount: 1 }], result: { won: true, roll: 4, payout: 2 }, message: 'Dado 4 · +2' },
  { method: 'slots', tab: 'chance', button: 'Girar cilindros · 1 ficha', args: [], result: { won: true, reels: ['A', 'A', 'A'], payout: 5 }, message: 'A | A | A · +5' },
  { method: 'fight', tab: 'economy', button: 'Lutar · 1 ficha', args: ['monster'], result: { won: true, fragments_earned: 2 }, message: 'Vitória · +2 fragmentos' },
  { method: 'enchant', tab: 'economy', button: 'Encantar · 10 fragmentos', args: [], result: { success: true, weapon: { level: 4 } }, message: 'Arma +4' },
] as const
it('bloqueia repetição e outras ações enquanto o giro está pendente', async () => {
  let finish!: (value: any) => void
  vi.mocked(gamesApi.spin).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const user = mount('roulette')
  await screen.findByText('10 fichas')
  const spin = await screen.findByRole('button', { name: 'Girar a roda' })
  await user.dblClick(spin)
  expect(gamesApi.spin).toHaveBeenCalledTimes(1)
  expect(spin).toBeDisabled()
  const buy = screen.getByRole('button', { name: 'Comprar' })
  expect(buy).toBeDisabled()
  await user.click(buy)
  expect(gamesApi.buyTokens).not.toHaveBeenCalled()
  finish({ failed: false, prize: { name: 'Adena', quantity: 50000, item_id: 57 } })
  await waitFor(() => expect(spin).toBeEnabled())
  expect(toast.success).not.toHaveBeenCalled()
  expect(screen.getByRole('status')).toHaveTextContent('Adena')
})
it.each(actions.filter((scenario) => scenario.method !== 'openBox'))('$method envia ação, mostra resultado e atualiza saldo', async scenario => {
  vi.mocked(gamesApi[scenario.method]).mockResolvedValue(scenario.result as any)
  const user = mount(scenario.tab)
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: scenario.button }))
  expect(gamesApi[scenario.method]).toHaveBeenCalledWith(...scenario.args)
  expect(toast.success).toHaveBeenCalledWith(scenario.message)
  await waitFor(() => expect(gamesApi.roulette).toHaveBeenCalledTimes(2))
})
it('recusa de rede no giro avisa e não revela prêmio', async () => {
  vi.mocked(gamesApi.spin).mockRejectedValue(new ApiError('Operação recusada', 400, 'INVALID'))
  const user = mount('roulette')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Girar a roda' }))
  expect(toast.error).toHaveBeenCalledWith('Operação recusada')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(document.querySelector('.roulette-orbit.is-spinning')).toBeNull()
})
it.each(actions)('$method apresenta recusa sem anunciar sucesso', async scenario => {
  vi.mocked(gamesApi[scenario.method]).mockRejectedValue(new ApiError('Operação recusada', 400, 'INVALID'))
  const user = mount(scenario.tab)
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: scenario.button }))
  expect(toast.error).toHaveBeenCalledWith('Operação recusada')
  expect(toast.success).not.toHaveBeenCalled()
})
it.each([
  { ...actions[4], result: { won: false, roll: 3 }, message: 'Dado 3 · perdeu' },
  { ...actions[5], result: { won: false, reels: ['A', 'B', 'C'] }, message: 'A | B | C · nada' },
  { ...actions[6], result: { won: false }, message: 'Derrota' },
  { ...actions[7], result: { success: false }, message: 'O encantamento falhou' },
])('$method diferencia derrota de falha de rede', async scenario => {
  vi.mocked(gamesApi[scenario.method]).mockResolvedValue(scenario.result as any)
  const user = mount(scenario.tab)
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: scenario.button }))
  expect(toast.error).toHaveBeenCalledWith(scenario.message)
  await waitFor(() => expect(gamesApi.roulette).toHaveBeenCalledTimes(2))
})
it('troca aba e envia valor/tipo da aposta alterados', async () => {
  vi.mocked(gamesApi.dice).mockResolvedValue({ won: true, roll: 5, payout: 8, fichas: 14 })
  const user = mount('roulette')
  await user.click(screen.getByRole('tab', { name: 'Mesa da Taverna' }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de aposta' }), 'odd')
  const input = screen.getByRole('textbox', { name: 'Fichas' })
  await user.clear(input)
  await user.type(input, '4')
  await user.click(screen.getByRole('button', { name: 'Lançar os dados' }))
  expect(gamesApi.dice).toHaveBeenCalledWith({ bet_type: 'odd', amount: 4 })
})
it('bônus resgatado e monstro em respawn não oferecem nova ação', async () => {
  vi.mocked(gamesApi.dailyBonus).mockResolvedValue({ amount: '5.00', claimed: true } as any)
  const user = mount('roulette')
  await screen.findByText('Bônus já resgatado hoje')
  expect(screen.queryByRole('button', { name: 'Resgatar bônus' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Arena das Feras' }))
  expect(screen.getByText('Retorna em 60s')).toBeVisible()
  expect(screen.getAllByRole('button', { name: 'Lutar · 1 ficha' })).toHaveLength(1)
})
it('desacelera o tambor enquanto o giro ainda corre', async () => {
  rouletteReveal.setSlowMs(20)
  let finish!: (value: any) => void
  vi.mocked(gamesApi.spin).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const user = mount('roulette')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Girar a roda' }))
  expect(document.querySelector('.roulette-orbit.is-spinning')).toBeTruthy()
  expect(document.querySelector('.roulette-orbit.is-slowing')).toBeNull()
  await waitFor(() => expect(document.querySelector('.roulette-orbit.is-slowing')).toBeTruthy())
  finish({ failed: false, prize: { name: 'Adena', quantity: 50000, item_id: 57 } })
  await waitFor(() => expect(document.querySelector('.roulette-orbit.is-win')).toBeTruthy())
  expect(document.querySelector('.roulette-orbit.is-slowing')).toBeNull()
})
it('gira a roleta no palco e marca o prêmio ao concluir', async () => {
  let finish!: (value: any) => void
  vi.mocked(gamesApi.spin).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const user = mount('roulette')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Girar a roda' }))
  expect(document.querySelector('.roulette-orbit.is-spinning')).toBeTruthy()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  finish({ failed: false, prize: { name: 'Adena', quantity: 50000, item_id: 57 } })
  await waitFor(() => expect(document.querySelector('.roulette-orbit.is-win')).toBeTruthy())
  expect(document.querySelector('.prize-item.is-hit')).toBeTruthy()
  expect(document.querySelector('.roulette-burst')).toBeTruthy()
  expect(document.querySelector('.roulette-prize')).toHaveTextContent('Adena')
  expect(screen.getByRole('status')).toHaveTextContent('Adena')
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
})
it('revela a falha do giro no palco sem notificação', async () => {
  vi.mocked(gamesApi.spin).mockResolvedValue({ failed: true, prize: null } as any)
  const user = mount('roulette')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Girar a roda' }))
  expect(await screen.findByRole('status')).toHaveTextContent('A roda não parou em prêmio.')
  expect(document.querySelector('.roulette-orbit.is-miss')).toBeTruthy()
  expect(document.querySelector('.roulette-miss-burst')).toBeTruthy()
  expect(document.querySelector('.roulette-burst')).toBeNull()
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
})
it('mostra a quantidade do prêmio da roleta no estilo do servidor', async () => {
  mount('roulette')
  expect(await screen.findByText('Adena')).toBeVisible()
  expect(screen.getByText('× 50K')).toBeVisible()
})
it('monta o tambor da roleta sem fatias de todos os prêmios', async () => {
  mount('roulette')
  await screen.findByText('Adena')
  expect(document.querySelector('.roulette-stage')).toBeTruthy()
  expect(document.querySelector('.roulette-reel')).toBeTruthy()
  expect(document.querySelector('.roulette-slice')).toBeNull()
  expect(document.querySelector('.roulette-pointer')).toBeNull()
})
it('mostra baús do tema nas caixas e anima a abertura', async () => {
  let finish!: (value: any) => void
  let releaseShake!: () => void
  let releaseReveal!: () => void
  const shakeGate = new Promise<void>(resolve => { releaseShake = resolve })
  const revealGate = new Promise<void>(resolve => { releaseReveal = resolve })
  boxReveal.setShake(() => shakeGate)
  boxReveal.setWait(() => revealGate)
  vi.mocked(gamesApi.openBox).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const user = mount('boxes')
  expect(await screen.findByText('Caixa rara')).toBeVisible()
  expect(document.querySelector('.game-chest[data-rarity="rare"]')).toBeTruthy()
  expect(document.querySelector('.game-chest-art')).toBeTruthy()
  expect(screen.getAllByText('Cada abertura custa 1 ficha.').length).toBeGreaterThan(0)
  await user.click(await screen.findByRole('button', { name: 'Abrir · 1 ficha' }))
  expect(document.querySelector('.game-box-card .game-chest.is-opening')).toBeTruthy()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  releaseShake()
  expect(await screen.findByRole('dialog', { name: 'O baú se abre…' })).toBeVisible()
  expect(document.querySelector('.game-chest.is-hero.is-opening')).toBeTruthy()
  expect(document.querySelector('.game-box-card .game-chest.is-opening')).toBeNull()
  finish({ item: { item_id: 2, name: 'Espada', enchant: 3, quantity: 1 }, remaining: 0, fichas: 9 })
  expect(document.querySelector('.game-chest.is-hero.is-opening')).toBeTruthy()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  releaseReveal()
  await waitFor(() => expect(document.querySelector('.game-chest.is-hero.is-win')).toBeTruthy())
  expect(screen.getByRole('dialog', { name: 'Você encontrou' })).toBeVisible()
  expect(document.querySelector('.game-chest-lid')).toBeTruthy()
  expect(document.querySelector('.game-chest-burst')).toBeTruthy()
  expect(document.querySelectorAll('.game-chest-spark').length).toBeGreaterThan(12)
  expect(document.querySelectorAll('.game-chest-ring').length).toBe(3)
  expect(screen.getByRole('status')).toHaveTextContent('Espada')
  expect(screen.getByRole('status')).toHaveTextContent('+3')
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
  expect(gamesApi.openBox).toHaveBeenCalledWith('box')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('explica o item em mira e o que mais pode sair do baú', async () => {
  mount('boxes')
  expect((await screen.findAllByText('Item em mira')).length).toBeGreaterThan(0)
  expect(screen.getByText('Compre o baú pelo item que você quer — arma S, joia de boss, encantamento. Nas outras aberturas, o caminho rende o resto do catálogo.')).toBeVisible()
  expect(screen.getAllByText('Enchant Weapon C').length).toBeGreaterThan(0)
  expect(screen.getByText('2 aberturas')).toBeVisible()
  expect(screen.getByText('Também pode sair')).toBeVisible()
  expect(screen.getByText('Baús à venda')).toBeVisible()
  expect(screen.getByText('Seus baús selados')).toBeVisible()
  expect(screen.queryByText(/boosters/i)).not.toBeInTheDocument()
})
it('oferece resetar o baú já selado em vez de comprar de novo', async () => {
  vi.mocked(gamesApi.boxes).mockResolvedValue({
    types: [{ id: 'type', name: 'Caixa rara', price: '10.00', boosters_amount: 2 }],
    boxes: [{ id: 'box', type_id: 'type', type_name: 'Caixa rara', remaining: 1, total: 2 }],
  } as any)
  vi.mocked(gamesApi.buyBox).mockResolvedValue({ id: 'box', remaining: 2 } as any)
  const user = mount('boxes')
  const reset = await screen.findByRole('button', { name: 'Resetar' })
  expect(reset).toBeVisible()
  expect(reset).toHaveClass('ui-button--warning')
  expect(screen.getByText('Substitui o baú selado deste tipo. O que ainda não abriu se perde.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Comprar' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Resetar' }))
  expect(gamesApi.buyBox).toHaveBeenCalledWith('type')
  expect(toast.success).toHaveBeenCalledWith('Baú resetado')
})
it('lista os baús do comum ao lendário e pinta a coluna pela raridade', async () => {
  vi.mocked(gamesApi.boxes).mockResolvedValue({
    types: [
      { id: 'leg', name: 'Baú Lendário', price: '100.00', boosters_amount: 12 },
      { id: 'com', name: 'Baú Comum', price: '10.00', boosters_amount: 5 },
      { id: 'epi', name: 'Baú Épico', price: '50.00', boosters_amount: 9 },
      { id: 'rar', name: 'Baú Raro', price: '25.00', boosters_amount: 7 },
    ],
    boxes: [],
  } as any)
  mount('boxes')
  expect(await screen.findByText('Baú Comum')).toBeVisible()
  const cards = [...document.querySelectorAll('.game-box-card')]
  expect(cards.map((card) => card.getAttribute('data-rarity'))).toEqual(['common', 'rare', 'epic', 'legendary'])
  expect(cards.map((card) => card.querySelector('strong')?.textContent)).toEqual([
    'Baú Comum',
    'Baú Raro',
    'Baú Épico',
    'Baú Lendário',
  ])
})
it('mostra o dado sorteado no palco', async () => {
  vi.mocked(gamesApi.dice).mockResolvedValue({ won: true, roll: 4, payout: 2 } as any)
  const user = mount('chance')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Lançar os dados' }))
  await waitFor(() => expect(document.querySelector('.chance-die')?.getAttribute('data-face')).toBe('4'))
})
it('mostra os cilindros com ícone e nome completo, sem cortar o id inglês', async () => {
  vi.mocked(gamesApi.minigames).mockResolvedValue({
    fichas: 10,
    dice: { active: true, min_bet: 1 },
    slots: { active: true, cost: 1, symbols: ['sword', 'shield', 'crown'] },
  } as any)
  mount('chance')
  expect(await screen.findByText('Espada')).toBeVisible()
  expect(screen.getByText('Escudo')).toBeVisible()
  expect(screen.getByText('Coroa')).toBeVisible()
  expect(document.querySelector('[data-symbol="sword"]')).toBeTruthy()
  expect(screen.queryByText('sword')).not.toBeInTheDocument()
})
it('usa retrato de monstro na arena', async () => {
  mount('economy')
  await screen.findByText('Orc')
  expect(document.querySelectorAll('.monster-portrait')).toHaveLength(2)
  expect(document.querySelector('.monster-portrait.is-down')).toBeTruthy()
})
it('mantém o atalho de recompensas dentro do hero', async () => {
  mount('roulette')
  const header = await screen.findByRole('banner')
  const jump = screen.getByRole('link', { name: 'Missões, bônus diário e rankings' })
  expect(header).toContainElement(jump)
  expect(jump).toHaveAttribute('href', '/panel/rewards')
  expect(jump).toHaveClass('games-hero-jump')
  expect(document.querySelector('.program-actions')).toBeNull()
})
