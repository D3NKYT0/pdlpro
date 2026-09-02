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
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(gamesApi.roulette).mockResolvedValue({ fichas: 10, cost: 1, fail_chance: 20, prizes: [] } as any)
  vi.mocked(gamesApi.dailyBonus).mockResolvedValue({ claimed: false, amount: '5.00' } as any)
  vi.mocked(gamesApi.boxes).mockResolvedValue({ types: [{ id: 'type', name: 'Caixa rara', price: '10.00', boosters_amount: 2 }], boxes: [{ id: 'box', type_name: 'Caixa adquirida', remaining: 1, total: 2 }] })
  vi.mocked(gamesApi.minigames).mockResolvedValue({ fichas: 10, dice: { active: true, min_bet: 1 }, slots: { active: true, cost: 1, symbols: ['A'] } })
  vi.mocked(gamesApi.economy).mockResolvedValue({ fichas: 10, weapon: { level: 3, fragments: 10 }, monsters: [{ id: 'monster', name: 'Orc', alive: true, level: 1, required_weapon_level: 1, fragment_reward: 2, respawn_in: 0 }, { id: 'resting', name: 'Troll', alive: false, level: 2, required_weapon_level: 2, fragment_reward: 3, respawn_in: 60 }] })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear() })
function mount(tab: string) {
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/painel/games?tab=${tab}`]}><GamesPage /></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
const actions = [
  { method: 'spin', tab: 'roulette', button: 'Girar agora', args: [], result: { failed: false, prize: { name: 'Adena' } }, message: 'Você ganhou Adena' },
  { method: 'buyTokens', tab: 'roulette', button: 'Comprar', args: [5], result: { fichas: 15 }, message: 'Fichas creditadas' },
  { method: 'claimDailyBonus', tab: 'roulette', button: 'Resgatar bônus', args: [], result: { amount: '5.00', claimed: true }, message: 'Bônus de R$ 5.00 creditado' },
  { method: 'buyBox', tab: 'boxes', button: 'Comprar', args: ['type'], result: { id: 'new-box', remaining: 2 }, message: 'Caixa comprada' },
  { method: 'openBox', tab: 'boxes', button: 'Abrir · 1 ficha', args: ['box'], result: { item: { name: 'Espada', enchant: 3 }, remaining: 0 }, message: 'Espada (+3)' },
  { method: 'dice', tab: 'chance', button: 'Jogar dado', args: [{ bet_type: 'even', amount: 1 }], result: { won: true, roll: 4, payout: 2 }, message: 'Dado 4 · +2' },
  { method: 'slots', tab: 'chance', button: 'Girar slots · 1 ficha', args: [], result: { won: true, reels: ['A', 'A', 'A'], payout: 5 }, message: 'A | A | A · +5' },
  { method: 'fight', tab: 'economy', button: 'Lutar · 1 ficha', args: ['monster'], result: { won: true, fragments_earned: 2 }, message: 'Vitória · +2 fragmentos' },
  { method: 'enchant', tab: 'economy', button: 'Encantar · 10 fragmentos', args: [], result: { success: true, weapon: { level: 4 } }, message: 'Arma +4' },
] as const
it.each(actions)('$method envia ação, mostra resultado e atualiza saldo', async scenario => {
  vi.mocked(gamesApi[scenario.method]).mockResolvedValue(scenario.result as any)
  const user = mount(scenario.tab)
  await screen.findByText('10 fichas')
  await user.click(await screen.findByRole('button', { name: scenario.button }))
  expect(gamesApi[scenario.method]).toHaveBeenCalledWith(...scenario.args)
  expect(toast.success).toHaveBeenCalledWith(scenario.message)
  await waitFor(() => expect(gamesApi.roulette).toHaveBeenCalledTimes(2))
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
  { ...actions[0], result: { failed: true }, message: 'Sem prêmio desta vez' },
  { ...actions[5], result: { won: false, roll: 3 }, message: 'Dado 3 · perdeu' },
  { ...actions[6], result: { won: false, reels: ['A', 'B', 'C'] }, message: 'A | B | C · nada' },
  { ...actions[7], result: { won: false }, message: 'Derrota' },
  { ...actions[8], result: { success: false }, message: 'O encantamento falhou' },
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
  await user.click(screen.getByRole('tab', { name: 'Dados e slots' }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de aposta' }), 'odd')
  const input = screen.getByRole('textbox', { name: 'Fichas' })
  await user.clear(input)
  await user.type(input, '4')
  await user.click(screen.getByRole('button', { name: 'Jogar dado' }))
  expect(gamesApi.dice).toHaveBeenCalledWith({ bet_type: 'odd', amount: 4 })
})
it('bônus resgatado e monstro em respawn não oferecem nova ação', async () => {
  vi.mocked(gamesApi.dailyBonus).mockResolvedValue({ amount: '5.00', claimed: true } as any)
  const user = mount('roulette')
  await screen.findByText('Bônus já resgatado hoje')
  expect(screen.queryByRole('button', { name: 'Resgatar bônus' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Economia' }))
  expect(screen.getByText('Retorna em 60s')).toBeVisible()
  expect(screen.getAllByRole('button', { name: 'Lutar · 1 ficha' })).toHaveLength(1)
})
