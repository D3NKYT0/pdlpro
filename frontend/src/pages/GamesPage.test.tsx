// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
const diceReveal = vi.hoisted(() => {
  let wait = () => Promise.resolve()
  let rest = () => new Promise<void>(() => {})
  return {
    wait: () => wait(),
    rest: () => rest(),
    setWait: (value: () => Promise<void>) => {
      wait = value
    },
    setRest: (value: () => Promise<void>) => {
      rest = value
    },
    reset: () => {
      wait = () => Promise.resolve()
      rest = () => new Promise<void>(() => {})
    },
  }
})
vi.mock('../components/games/diceReveal', () => ({
  DICE_REVEAL_MS: 0,
  DICE_CHOSEN_MS: 60_000,
  waitForDiceReveal: () => diceReveal.wait(),
  waitForDiceRest: () => diceReveal.rest(),
}))
const slotsReveal = vi.hoisted(() => {
  let wait = () => Promise.resolve()
  return {
    wait: () => wait(),
    setWait: (value: () => Promise<void>) => {
      wait = value
    },
    reset: () => {
      wait = () => Promise.resolve()
    },
  }
})
vi.mock('../components/games/slotsReveal', () => ({
  SLOTS_REVEAL_MS: 0,
  waitForSlotsReveal: () => slotsReveal.wait(),
}))
const fightReveal = vi.hoisted(() => {
  let wait = () => Promise.resolve()
  return {
    wait: () => wait(),
    setWait: (value: () => Promise<void>) => {
      wait = value
    },
    reset: () => {
      wait = () => Promise.resolve()
    },
  }
})
vi.mock('../components/games/fightReveal', () => ({
  FIGHT_REVEAL_MS: 0,
  waitForFightReveal: () => fightReveal.wait(),
}))
const enchantReveal = vi.hoisted(() => {
  let wait = () => Promise.resolve()
  return {
    wait: () => wait(),
    setWait: (value: () => Promise<void>) => {
      wait = value
    },
    reset: () => {
      wait = () => Promise.resolve()
    },
  }
})
vi.mock('../components/games/enchantReveal', () => ({
  ENCHANT_REVEAL_MS: 0,
  waitForEnchantReveal: () => enchantReveal.wait(),
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let client: QueryClient
beforeEach(() => {
  rouletteReveal.reset()
  boxReveal.reset()
  diceReveal.reset()
  slotsReveal.reset()
  fightReveal.reset()
  enchantReveal.reset()
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
      hunt_remaining: true,
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
function namedButton(name: string) {
  return screen.getAllByRole('button', { name }).find((button) => !(button as HTMLButtonElement).disabled) ?? screen.getByRole('button', { name })
}
const actions = [
  { method: 'buyTokens', tab: 'roulette', button: 'Comprar', args: [5], result: { fichas: 15 }, message: 'Fichas creditadas' },
  { method: 'claimDailyBonus', tab: 'roulette', button: 'Resgatar bônus', args: [], result: { amount: '5.00', claimed: true }, message: 'Bônus de R$ 5.00 creditado' },
  { method: 'buyBox', tab: 'boxes', button: 'Comprar', args: ['type'], result: { id: 'new-box', remaining: 2 }, message: 'Caixa comprada' },
  { method: 'openBox', tab: 'boxes', button: 'Abrir · 1 ficha', args: ['box'], result: { item: { name: 'Espada', enchant: 3 }, remaining: 0 }, message: 'Espada (+3)' },
  { method: 'dice', tab: 'chance', button: 'Lançar os dados', args: [{ bet_type: 'even', amount: 1 }], result: { won: true, roll: 4, payout: 2 }, message: 'Dado 4 · +2' },
  { method: 'slots', tab: 'chance', button: 'Girar cilindros · 1 ficha', args: [], result: { won: true, reels: ['A', 'A', 'A'], payout: 5 }, message: 'A | A | A · +5' },
  { method: 'fight', tab: 'economy', button: 'Lutar · 1 ficha', args: ['monster'], result: { won: true, rounds: 3, fragments_earned: 2 }, message: 'Vitória · +2 fragmentos' },
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
it.each(actions.filter((scenario) => !['openBox', 'dice', 'slots', 'fight', 'enchant'].includes(scenario.method)))('$method envia ação, mostra resultado e atualiza saldo', async scenario => {
  vi.mocked(gamesApi[scenario.method]).mockResolvedValue(scenario.result as any)
  const user = mount(scenario.tab)
  await screen.findByText('10 fichas')
  await user.click(namedButton(scenario.button))
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
  await user.click(namedButton(scenario.button))
  expect(toast.error).toHaveBeenCalledWith('Operação recusada')
  expect(toast.success).not.toHaveBeenCalled()
})
it('abre o modal de encante tentando e revela sucesso sem toast', async () => {
  let release!: () => void
  enchantReveal.setWait(() => new Promise<void>((resolve) => { release = resolve }))
  vi.mocked(gamesApi.enchant).mockResolvedValue({ success: true, weapon: { level: 4 } } as any)
  const user = mount('economy')
  await screen.findByText('Orc')
  await user.click(namedButton('Encantar · 10 fragmentos'))
  const attempting = await screen.findByRole('dialog', { name: 'Encantando…' })
  expect(attempting).toHaveClass('game-enchant-reveal-modal', 'is-attempting')
  expect(attempting).toHaveTextContent('+3')
  expect(attempting).toHaveTextContent('+4')
  expect(attempting).toHaveTextContent('Tentando +3 → +4')
  expect(attempting.querySelector('.weapon-art.is-from')).toHaveAttribute('data-enchant', '3')
  expect(attempting.querySelector('.weapon-art.is-toward')).toHaveAttribute('data-enchant', '4')
  expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
  expect(toast.success).not.toHaveBeenCalled()
  release()
  const dialog = await screen.findByRole('dialog', { name: 'Sucesso' })
  expect(dialog).toHaveClass('is-win')
  expect(dialog).not.toHaveClass('is-attempting', 'is-loss')
  expect(dialog.querySelector('.enchant-reveal-outcome')).toHaveTextContent('A arma subiu para +4')
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.queryByRole('dialog', { name: 'Sucesso' })).not.toBeInTheDocument()
})
it('revela falha do encante no modal sem toast', async () => {
  vi.mocked(gamesApi.enchant).mockResolvedValue({ success: false, weapon: { level: 3 } } as any)
  const user = mount('economy')
  await screen.findByText('Orc')
  await user.click(namedButton('Encantar · 10 fragmentos'))
  const dialog = await screen.findByRole('dialog', { name: 'Falhou' })
  expect(dialog).toHaveClass('game-enchant-reveal-modal', 'is-loss')
  expect(dialog.querySelector('.enchant-reveal-outcome')).toHaveTextContent('A arma permanece +3')
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
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
  const fights = screen.getAllByRole('button', { name: 'Lutar · 1 ficha' })
  expect(fights).toHaveLength(2)
  expect(fights[0]).toBeEnabled()
  expect(fights[1]).toBeDisabled()
  const timer = screen.getByRole('timer')
  expect(timer).toHaveAccessibleName(/Retorna em/)
  expect(timer.querySelector('b')).toHaveTextContent(/^\d{2}:\d{2}$/)
  expect(timer.querySelector('.respawn-timer-fill')).toBeTruthy()
  await user.click(fights[1])
  expect(gamesApi.fight).not.toHaveBeenCalled()
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
  expect(document.querySelector('.roulette-core')).toBeTruthy()
  expect(document.querySelector('.roulette-backdrop')).toBeTruthy()
  expect(document.querySelector('.roulette-field')).toBeTruthy()
  expect(document.querySelectorAll('.roulette-field-speck').length).toBe(18)
  expect(document.querySelectorAll('.roulette-mote').length).toBe(12)
  expect(document.querySelector('.roulette-reel')).toBeTruthy()
  expect(document.querySelector('.roulette-slice')).toBeNull()
  expect(document.querySelector('.roulette-pointer')).toBeNull()
  expect(document.querySelector('.roulette-orbit-flare')).toBeNull()
})
it('mostra como a roleta funciona e dicas abaixo do bônus diário', async () => {
  mount('roulette')
  expect(await screen.findByRole('heading', { name: 'Como funciona' })).toBeVisible()
  expect(screen.getByText(/O tambor acelera no centro/)).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Dicas' })).toBeVisible()
  expect(screen.getByText(/Cada giro consome fichas/)).toBeVisible()
  expect(screen.getByText(/A chance de falha agora é 20%/)).toBeVisible()
  expect(screen.getByText(/não gasta ficha/)).toBeVisible()
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
  expect(screen.getAllByText('Cada pacote custa 1 ficha. O item em mira sai em algum deles.').length).toBeGreaterThan(0)
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
  expect(document.querySelector('.game-chest.is-hunt')).toBeNull()
  expect(document.querySelector('.game-box-hunt-field')).toBeNull()
  expect(document.querySelector('.game-chest.is-hero .game-chest-art')).toBeTruthy()
  expect(document.querySelector('.game-chest-burst')).toBeTruthy()
  expect(document.querySelectorAll('.game-chest-spark').length).toBeGreaterThan(12)
  expect(document.querySelectorAll('.game-chest-ring').length).toBe(3)
  expect(document.querySelector('.game-chest-rays')).toBeTruthy()
  expect(document.querySelector('.game-chest-prize-core')).toBeTruthy()
  expect(document.querySelector('.game-chest-prize-shine')).toBeTruthy()
  const prize = document.querySelector('.game-chest.is-hero .game-chest-prize')
  const stage = document.querySelector('.game-chest.is-hero .game-chest-stage')
  expect(prize).toBeTruthy()
  expect(stage).toBeTruthy()
  expect(prize?.compareDocumentPosition(stage!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  expect(document.querySelectorAll('.game-chest-mote').length).toBeGreaterThan(10)
  expect(screen.getByRole('status')).toHaveTextContent('Espada')
  expect(screen.getByRole('status')).toHaveTextContent('+3')
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
  expect(gamesApi.openBox).toHaveBeenCalledWith('box')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('abre a explicação dos baús pelo atalho de ajuda', async () => {
  const user = mount('boxes')
  await screen.findByText('Garantido neste baú')
  expect(screen.queryByRole('dialog', { name: 'Como funcionam os baús' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Como funcionam os baús' }))
  const dialog = await screen.findByRole('dialog', { name: 'Como funcionam os baús' })
  expect(dialog).toHaveTextContent('O baú não é uma roleta')
  expect(dialog).toHaveTextContent('É sempre lendário e já está em um dos pacotes')
  expect(dialog).toHaveTextContent('Comum libera 20 pacotes, raro 30, épico 40 e lendário 50')
  expect(dialog).toHaveTextContent('Cada pacote custa 1 ficha')
  expect(dialog).toHaveTextContent('Só depois de abrir pelo menos um pacote')
  await user.click(screen.getByRole('button', { name: 'Entendi' }))
  expect(screen.queryByRole('dialog', { name: 'Como funcionam os baús' })).not.toBeInTheDocument()
})
it('explica o item em mira e o que mais pode sair do baú', async () => {
  mount('boxes')
  expect(await screen.findByText('Garantido neste baú')).toBeVisible()
  expect(screen.getByText('Ainda está no baú')).toBeVisible()
  expect(screen.getByText('Diferente da roleta: o item em mira é sempre lendário e já está em um dos pacotes. Você sempre leva — a sorte só decide se sai no primeiro ou no último.')).toBeVisible()
  expect(screen.getAllByText('Enchant Weapon C').length).toBeGreaterThan(0)
  expect(screen.getByText('2 pacotes')).toBeVisible()
  expect(screen.getByText('Também pode sair')).toBeVisible()
  expect(screen.getByText('Baús à venda')).toBeVisible()
  expect(screen.getByText('Seus baús selados')).toBeVisible()
  expect(document.querySelector('.game-box-card.is-owned')).toBeTruthy()
  expect(document.querySelector('.game-box-card:not(.is-owned)')).toBeTruthy()
  expect(document.querySelector('.game-chest.is-claimed')).toBeNull()
  const open = screen.getByRole('button', { name: 'Abrir · 1 ficha' })
  expect(open).toHaveClass('ui-button--success')
  expect(open.closest('.game-box-actions')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Comprar' }).closest('.game-box-actions')).toBeTruthy()
  expect(screen.queryByText(/boosters/i)).not.toBeInTheDocument()
})
it('risca o baú que já entregou o item em mira', async () => {
  vi.mocked(gamesApi.boxes).mockResolvedValue({
    types: [],
    boxes: [{
      id: 'box',
      type_id: 'owned-type',
      type_name: 'Caixa adquirida',
      remaining: 1,
      total: 2,
      hunt_remaining: false,
      featured: { name: 'Enchant Weapon C', item_id: 951, quantity: 1 },
    }],
  } as any)
  mount('boxes')
  expect(await screen.findByText('Já saiu neste baú')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Abrir · 1 ficha' })).toHaveClass('ui-button--yellow')
  expect(document.querySelector('.game-box-card.is-claimed')).toBeTruthy()
  expect(document.querySelector('.game-chest.is-claimed')).toBeTruthy()
  expect(document.querySelector('.game-chest-claimed')).toBeTruthy()
})
it('celebra o item em mira quando o pacote é o da caçada', async () => {
  vi.mocked(gamesApi.openBox).mockResolvedValue({
    item: { item_id: 951, name: 'Enchant Weapon C', quantity: 1 },
    remaining: 1,
    hunt: true,
    fichas: 9,
  } as any)
  const user = mount('boxes')
  await user.click(await screen.findByRole('button', { name: 'Abrir · 1 ficha' }))
  expect(await screen.findByRole('dialog', { name: 'Você encontrou o item em mira' })).toBeVisible()
  expect(document.querySelector('.game-box-reveal-modal.is-hunt')).toBeTruthy()
  expect(document.querySelector('.game-chest.is-hunt')).toBeTruthy()
  expect(document.querySelector('.game-box-hunt-field')).toBeTruthy()
  expect(document.querySelectorAll('.game-box-hunt-particle').length).toBeGreaterThan(12)
  expect(document.querySelectorAll('.game-box-hunt-orb').length).toBeGreaterThan(3)
  expect(toast.success).not.toHaveBeenCalled()
})
it('abre o modal de compra quando não há fichas para abrir o baú', async () => {
  vi.mocked(gamesApi.roulette).mockResolvedValue({
    fichas: 0,
    cost: 1,
    fail_chance: 20,
    prizes: [{ id: 'p1', name: 'Adena', rarity: 'comum', item_id: 57, weight: 10, quantity: 50000 }],
  } as any)
  vi.mocked(gamesApi.buyTokens).mockResolvedValue({ fichas: 5 } as any)
  const user = mount('boxes')
  await screen.findByText('0 ficha')
  await user.click(await screen.findByRole('button', { name: 'Abrir · 1 ficha' }))
  expect(gamesApi.openBox).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
  const dialog = await screen.findByRole('dialog', { name: 'Comprar fichas' })
  expect(dialog).toHaveTextContent('Você não tem fichas suficientes para esta jogada')
  expect(dialog.querySelector('.game-tokens-buy-stage')).toBeTruthy()
  expect(dialog.querySelector('.game-tokens-buy-medallion')).toBeTruthy()
  expect(within(dialog).getByRole('button', { name: '5 fichas' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(within(dialog).getByRole('button', { name: '25 fichas' }))
  await user.click(within(dialog).getByRole('button', { name: /Comprar/ }))
  expect(gamesApi.buyTokens).toHaveBeenCalledWith(25)
  expect(toast.success).toHaveBeenCalledWith('Fichas creditadas')
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Comprar fichas' })).not.toBeInTheDocument())
})
it('abre o modal de fichas quando a API recusa INSUFFICIENT_TOKENS', async () => {
  vi.mocked(gamesApi.openBox).mockRejectedValue(new ApiError('Fichas insuficientes', 400, 'INSUFFICIENT_TOKENS'))
  const user = mount('boxes')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Abrir · 1 ficha' }))
  expect(gamesApi.openBox).toHaveBeenCalledWith('box')
  expect(await screen.findByRole('dialog', { name: 'Comprar fichas' })).toBeVisible()
  expect(toast.error).not.toHaveBeenCalled()
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
  await user.click(reset)
  expect(gamesApi.buyBox).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'Resetar este baú?' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog', { name: 'Resetar este baú?' })).not.toBeInTheDocument()
  expect(gamesApi.buyBox).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Resetar' }))
  await user.click(screen.getByRole('button', { name: 'Resetar baú' }))
  expect(gamesApi.buyBox).toHaveBeenCalledWith('type')
  expect(toast.success).toHaveBeenCalledWith('Baú resetado')
})
it('não deixa resetar o baú intacto sem abrir nenhum pacote', async () => {
  vi.mocked(gamesApi.boxes).mockResolvedValue({
    types: [{ id: 'type', name: 'Caixa rara', price: '10.00', boosters_amount: 2 }],
    boxes: [{ id: 'box', type_id: 'type', type_name: 'Caixa rara', remaining: 2, total: 2 }],
  } as any)
  const user = mount('boxes')
  const reset = await screen.findByRole('button', { name: 'Resetar' })
  expect(reset).toBeDisabled()
  expect(screen.getByText('Abra pelo menos um pacote antes de resetar.')).toBeVisible()
  await user.click(reset)
  expect(gamesApi.buyBox).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog', { name: 'Resetar este baú?' })).not.toBeInTheDocument()
})
it('lista os baús do comum ao lendário e pinta a coluna pela raridade', async () => {
  vi.mocked(gamesApi.boxes).mockResolvedValue({
    types: [
      { id: 'leg', name: 'Baú Lendário', price: '100.00', boosters_amount: 50 },
      { id: 'com', name: 'Baú Comum', price: '10.00', boosters_amount: 20 },
      { id: 'epi', name: 'Baú Épico', price: '50.00', boosters_amount: 40 },
      { id: 'rar', name: 'Baú Raro', price: '25.00', boosters_amount: 30 },
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
  expect(document.querySelector('.chance-dice-felt')).toBeTruthy()
  expect(document.querySelector('.chance-die')?.tagName).toBe('DIV')
  expect(document.querySelector('.chance-die-cube')).toBeTruthy()
  expect(document.querySelectorAll('.chance-die-face')).toHaveLength(6)
  expect(document.querySelector('.chance-slots-cabinet')).toBeTruthy()
  expect(document.querySelectorAll('.chance-reel-window')).toHaveLength(3)
  await user.click(await screen.findByRole('button', { name: 'Lançar os dados' }))
  await waitFor(() => expect(document.querySelector('.chance-die')?.getAttribute('data-face')).toBe('4'))
  expect(document.querySelector('.chance-dice.is-chosen.is-win')).toBeTruthy()
  expect(document.querySelector('.chance-die-face.is-front')?.getAttribute('data-pip-face')).toBe('4')
})
it('volta o dado ao repouso depois do brilho da face escolhida', async () => {
  let releaseRest!: () => void
  diceReveal.setRest(() => new Promise<void>((resolve) => { releaseRest = resolve }))
  vi.mocked(gamesApi.dice).mockResolvedValue({ won: true, roll: 4, payout: 2 } as any)
  const user = mount('chance')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Lançar os dados' }))
  await waitFor(() => expect(document.querySelector('.chance-dice.is-chosen')).toBeTruthy())
  releaseRest()
  await waitFor(() => expect(document.querySelector('.chance-dice.is-rest')).toBeTruthy())
  expect(document.querySelector('.chance-dice.is-chosen')).toBeNull()
  expect(document.querySelector('.chance-die')?.getAttribute('data-face')).toBe('4')
})
it('abre o modal de vitória depois do cubo 3d pousar, sem toast', async () => {
  let release!: () => void
  diceReveal.setWait(() => new Promise<void>((resolve) => { release = resolve }))
  vi.mocked(gamesApi.dice).mockResolvedValue({ won: true, roll: 4, payout: 2 } as any)
  const user = mount('chance')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Lançar os dados' }))
  await waitFor(() => expect(document.querySelector('.chance-dice.is-rolling')).toBeTruthy())
  await waitFor(() => expect(document.querySelector('.chance-die')?.getAttribute('data-face')).toBe('4'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(toast.success).not.toHaveBeenCalled()
  release()
  await waitFor(() => expect(document.querySelector('.chance-dice.is-rolling')).toBeNull())
  const dialog = await screen.findByRole('dialog', { name: 'Vitória' })
  expect(dialog).toHaveClass('game-chance-reveal-modal', 'is-win')
  expect(dialog).not.toHaveClass('is-loss')
  expect(dialog.querySelector('.game-chance-reveal-face')?.getAttribute('data-face')).toBe('4')
  expect(dialog.querySelector('.game-chance-reveal-wash')).toBeTruthy()
  expect(dialog.querySelector('.game-chance-reveal-orb')).toBeNull()
  expect(dialog.querySelector('.game-chance-reveal-outcome')).toHaveTextContent('+2')
  expect(dialog.querySelector('.game-chance-reveal-actions')?.querySelector('.btn')).toBeTruthy()
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('marca o dado e os cilindros enquanto a jogada está pendente', async () => {
  let finishDice!: (value: any) => void
  let finishSlots!: (value: any) => void
  vi.mocked(gamesApi.dice).mockReturnValue(new Promise(resolve => { finishDice = resolve }))
  vi.mocked(gamesApi.slots).mockReturnValue(new Promise(resolve => { finishSlots = resolve }))
  const user = mount('chance')
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: 'Lançar os dados' }))
  expect(document.querySelector('.chance-dice.is-rolling')).toBeTruthy()
  finishDice({ won: true, roll: 4, payout: 2 })
  await waitFor(() => expect(document.querySelector('.chance-dice.is-rolling')).toBeNull())
  await user.click(await screen.findByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Girar cilindros · 1 ficha' }))
  expect(document.querySelector('.chance-slots.is-spinning')).toBeTruthy()
  expect(document.querySelector('.chance-reel-strip')).toBeTruthy()
  finishSlots({ won: true, reels: ['sword', 'sword', 'sword'], payout: 5 })
  await waitFor(() => expect(document.querySelector('.chance-slots.is-spinning')).toBeNull())
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
  expect(screen.getByRole('heading', { name: 'Como apostar' })).toBeVisible()
  expect(document.querySelector('.chance-guide.is-pairs')).toBeTruthy()
  expect(document.querySelectorAll('.chance-play-foot')).toHaveLength(2)
  expect(screen.getByText('Escolha um lado do cubo e as fichas da rodada. Se a face cair no seu lado, você recebe o dobro; se errar, a aposta não volta.')).toBeVisible()
  expect(screen.getByText('2, 4 ou 6 · 2×')).toBeVisible()
  expect(screen.getByText('1, 3 ou 5 · 2×')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Como girar' })).toBeVisible()
  expect(screen.getByText('Pague 1 ficha e os três cilindros param na mesma linha. Só a combinação decide o prêmio.')).toBeVisible()
  expect(screen.getByText('Três iguais')).toBeVisible()
  expect(screen.getByText('10× as fichas do giro')).toBeVisible()
  expect(screen.getByText('Dois iguais')).toBeVisible()
  expect(screen.getByText('2× as fichas do giro')).toBeVisible()
  expect(screen.getByText('Nada nesta rodada')).toBeVisible()
  expect(document.querySelector('[data-symbol="sword"]')).toBeTruthy()
  expect(document.querySelector('[data-slot-mark="sword"]')).toBeTruthy()
  expect(document.querySelector('.chance-reel-cell[data-symbol="sword"]')).toBeTruthy()
  expect(document.querySelector('.chance-slots-cabinet')).toBeTruthy()
  expect(document.querySelector('.chance-slots-marquee')).toBeTruthy()
  expect(screen.queryByText('sword')).not.toBeInTheDocument()
})
it('abre o modal de derrota depois do giro do caça-níquel, sem toast', async () => {
  let release!: () => void
  slotsReveal.setWait(() => new Promise<void>((resolve) => { release = resolve }))
  vi.mocked(gamesApi.slots).mockResolvedValue({ won: false, reels: ['sword', 'shield', 'crown'], payout: 0 } as any)
  const user = mount('chance')
  await screen.findByText('10 fichas')
  await user.click(screen.getByRole('button', { name: 'Girar cilindros · 1 ficha' }))
  await waitFor(() => expect(document.querySelector('.chance-slots.is-spinning')).toBeTruthy())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(toast.success).not.toHaveBeenCalled()
  release()
  await waitFor(() => expect(document.querySelector('.chance-slots.is-spinning')).toBeNull())
  const dialog = await screen.findByRole('dialog', { name: 'Derrota' })
  expect(dialog).toHaveClass('game-chance-reveal-modal', 'is-loss')
  expect(dialog).not.toHaveClass('is-win')
  expect(dialog.querySelectorAll('.game-chance-reveal-reel')).toHaveLength(3)
  expect(screen.getByText('Nada desta vez')).toBeVisible()
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
})
it('mostra a trilha de encante até +10 com o próximo passo em destaque', async () => {
  mount('economy')
  await screen.findByText('Orc')
  const path = screen.getByRole('progressbar', { name: 'Arma +3 de +10' })
  const steps = [...path.querySelectorAll('.weapon-path-steps li')]
  expect(steps).toHaveLength(10)
  expect(steps.filter((step) => step.classList.contains('is-done'))).toHaveLength(3)
  expect(path.querySelector('.weapon-path-steps li.is-next')).toHaveTextContent('+4')
  expect(screen.getByText('Próximo passo · +4')).toBeVisible()
  const chip = document.querySelector('.weapon-level')
  expect(chip).toHaveTextContent('Arma')
  expect(chip).toHaveTextContent('+3')
  expect(chip).toHaveTextContent('/ +10')
})
it('pinta Lutar de amarelo sem fichas e Encantar de verde com fragmentos', async () => {
  mount('economy')
  await screen.findByText('Orc')
  expect(screen.getAllByRole('button', { name: 'Lutar · 1 ficha' })[0]).toHaveClass('ui-button--secondary')
  expect(screen.getByRole('button', { name: 'Encantar · 10 fragmentos' })).toHaveClass('ui-button--success')
  expect(screen.getByRole('button', { name: 'Encantar · 10 fragmentos' })).toBeEnabled()
  const bar = screen.getByRole('progressbar', { name: '10 de 10 fragmentos' })
  expect(bar).toHaveClass('is-ready')
  expect(bar.querySelectorAll('.fragment-progress-pips i')).toHaveLength(10)
  expect(bar.querySelector('.fragment-progress-fill')).toHaveStyle({ width: '100%' })
})
it('abre a compra de fichas pelo Lutar amarelo e trava Encantar sem fragmentos', async () => {
  vi.mocked(gamesApi.roulette).mockResolvedValue({
    fichas: 0,
    cost: 1,
    fail_chance: 20,
    prizes: [{ id: 'p1', name: 'Adena', rarity: 'comum', item_id: 57, weight: 10, quantity: 50000 }],
  } as any)
  vi.mocked(gamesApi.economy).mockResolvedValue({
    fichas: 0,
    weapon: { level: 3, fragments: 3 },
    monsters: [
      { id: 'monster', name: 'Orc', alive: true, level: 1, required_weapon_level: 1, fragment_reward: 2, respawn_in: 0 },
      { id: 'drake', name: 'Drake', alive: true, level: 8, required_weapon_level: 8, fragment_reward: 5, respawn_in: 0 },
    ],
  } as any)
  const user = mount('economy')
  await screen.findByText('Orc')
  await screen.findByText('0 ficha')
  const [ready, locked] = screen.getAllByRole('button', { name: 'Lutar · 1 ficha' })
  expect(ready).toHaveClass('ui-button--yellow')
  expect(ready).toBeEnabled()
  expect(locked).toBeDisabled()
  expect(locked).not.toHaveClass('ui-button--yellow')
  expect(screen.getByRole('button', { name: 'Encantar · 10 fragmentos' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Encantar · 10 fragmentos' })).not.toHaveClass('ui-button--success')
  expect(screen.getByRole('progressbar', { name: '3 de 10 fragmentos' })).not.toHaveClass('is-ready')
  await user.click(ready)
  expect(gamesApi.fight).not.toHaveBeenCalled()
  expect(await screen.findByRole('dialog', { name: 'Comprar fichas' })).toBeVisible()
})
it('usa retrato de monstro na arena', async () => {
  mount('economy')
  await screen.findByText('Orc')
  expect(document.querySelectorAll('.monster-portrait')).toHaveLength(2)
  expect(document.querySelector('.monster-portrait.is-down')).toBeTruthy()
})
it('divide a arena em lista de feras e palco só para o combate', async () => {
  mount('economy')
  await screen.findByText('Orc')
  expect(document.querySelector('.economy-content')).toBeTruthy()
  expect(document.querySelector('.economy-roster')).toBeTruthy()
  expect(document.querySelector('.economy-stage')).toBeTruthy()
  expect(document.querySelector('.economy-roster')?.contains(screen.getByText('Orc'))).toBe(true)
  expect(document.querySelector('.battle-stage.is-idle')).toBeTruthy()
  expect(document.querySelector('.battle-field')).toBeTruthy()
  expect(document.querySelectorAll('.battle-mote').length).toBe(12)
  expect(document.querySelector('.battle-floor')).toBeTruthy()
  expect(document.querySelector('.battle-field-rays')).toBeTruthy()
  expect(screen.getByRole('status')).toHaveTextContent('Escolha uma fera para lutar.')
  expect(screen.getByText('Você')).toBeVisible()
  expect(document.querySelector('.battle-vs')?.textContent).toBe('VS')
  expect(document.querySelector('.weapon-art[data-enchant="3"]')).toBeTruthy()
})
it('anima o confronto no palco e revela a vitória sem toast', async () => {
  let release!: () => void
  fightReveal.setWait(() => new Promise<void>((resolve) => { release = resolve }))
  vi.mocked(gamesApi.fight).mockResolvedValue({ won: true, rounds: 3, fragments_earned: 2 } as any)
  const user = mount('economy')
  await screen.findByText('10 fichas')
  await user.click(namedButton('Lutar · 1 ficha'))
  await waitFor(() => expect(document.querySelector('.battle-stage.is-clash')).toBeTruthy())
  expect(document.querySelector('.monster-item.is-fighting')).toBeTruthy()
  expect(document.querySelector('.monster-portrait.is-hero.is-fighting')).toBeTruthy()
  expect(document.querySelector('.battle-slash')).toBeTruthy()
  expect(document.querySelector('.battle-impact')).toBeTruthy()
  expect(document.querySelector('.battle-shock')).toBeTruthy()
  expect(document.querySelectorAll('.battle-hit').length).toBe(4)
  expect(screen.getByRole('status')).toHaveTextContent('O combate está em andamento')
  expect(toast.success).not.toHaveBeenCalled()
  release()
  await waitFor(() => expect(document.querySelector('.battle-stage.is-win')).toBeTruthy())
  expect(document.querySelector('.battle-stage.is-clash')).toBeNull()
  expect(screen.getByRole('status')).toHaveTextContent('Vitória')
  expect(screen.getByRole('status')).toHaveTextContent('+2 fragmentos')
  expect(screen.getByRole('status')).toHaveTextContent('3 rodadas')
  expect(document.querySelector('.battle-burst')).toBeTruthy()
  expect(document.querySelector('.battle-flash')).toBeTruthy()
  expect(document.querySelectorAll('.battle-spark').length).toBe(16)
  expect(document.querySelector('.battle-stage .monster-portrait.is-hero')).toBeTruthy()
  expect(document.querySelector('.battle-fighter.is-player.is-victor')).toBeTruthy()
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
  await waitFor(() => expect(gamesApi.roulette).toHaveBeenCalledTimes(2))
})
it('revela a derrota no palco sem toast', async () => {
  vi.mocked(gamesApi.fight).mockResolvedValue({ won: false, rounds: 4, fragments_earned: 0 } as any)
  const user = mount('economy')
  await screen.findByText('10 fichas')
  await user.click(namedButton('Lutar · 1 ficha'))
  await waitFor(() => expect(document.querySelector('.battle-stage.is-loss')).toBeTruthy())
  expect(screen.getByRole('status')).toHaveTextContent('Derrota')
  expect(screen.getByRole('status')).toHaveTextContent('4 rodadas')
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
  await waitFor(() => expect(gamesApi.roulette).toHaveBeenCalledTimes(2))
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
