// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiError, gamesApi } from '../../services/api'
import { programsApi } from '../../services/domain/programs.service'
import { FishingGame } from './FishingGame'

vi.mock('../../services/domain/games.service', () => ({ gamesApi: { fishing: vi.fn(), cast: vi.fn() } }))
vi.mock('../../services/domain/programs.service', () => ({ programsApi: { fishing: vi.fn(), buyBait: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let client: QueryClient
const state = { active: true, cost: 2, fichas: 20, rod: { level: 3, xp: 40 }, recent: [] }
const details = {
  baits: [{ id: 'bait', name: 'Minhoca', description: 'Isca especial', quantity: 1, price: 3, success_bonus: 10 }, { id: 'empty', name: 'Mosca', description: '', quantity: 0, price: 5, success_bonus: 20 }],
  collection: [{ id: 'fish', name: 'Truta', rarity: 'rare', count: 1 }, { id: 'hidden', name: 'Carpa', rarity: 'epic', count: 0 }],
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(gamesApi.fishing).mockResolvedValue(state)
  vi.mocked(programsApi.fishing).mockResolvedValue(details)
  vi.mocked(gamesApi.cast).mockResolvedValue({ success: true, fish: { name: 'Truta', rarity: 'rare' }, rod: state.rod, fichas: 18 })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks() })
function mount() {
  render(<QueryClientProvider client={client}><FishingGame /></QueryClientProvider>)
  return userEvent.setup()
}
it('exibe coleção e oferece somente iscas em estoque para lançar', async () => {
  mount()
  expect(await screen.findByText('Raro · 1 captura')).toBeVisible()
  expect(screen.getByText('Épico · Ainda não descoberto')).toBeVisible()
  expect(screen.getAllByRole('option')).toHaveLength(2)
  expect(screen.getByText('Nível 3')).toBeVisible()
})
it.each([true, false])('lança com a última isca e apresenta captura=%s', async success => {
  vi.mocked(gamesApi.cast).mockResolvedValue({ success, fish: success ? { name: 'Truta', rarity: 'rare' } : null, rod: state.rod, fichas: 18 })
  const user = mount()
  await screen.findByRole('option', { name: /Minhoca/ })
  await user.selectOptions(screen.getByRole('combobox'), 'bait')
  await user.click(screen.getByRole('button', { name: 'Lançar a linha' }))
  expect(gamesApi.cast).toHaveBeenCalledWith('bait')
  expect(await screen.findByRole('status')).toHaveTextContent(success ? 'Você pescou Truta!' : 'O peixe escapou')
  expect(screen.getByRole('combobox')).toHaveValue('')
  await waitFor(() => expect(gamesApi.fishing).toHaveBeenCalledTimes(2))
})
it('lança sem isca, impede repetição pendente e permite tentar após erro', async () => {
  let reject!: (reason: unknown) => void
  vi.mocked(gamesApi.cast).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
  const user = mount()
  const button = screen.getByRole('button', { name: 'Lançar a linha' })
  await waitFor(() => expect(button).toBeEnabled())
  await user.dblClick(button)
  expect(gamesApi.cast).toHaveBeenCalledTimes(1)
  expect(gamesApi.cast).toHaveBeenCalledWith(undefined)
  expect(button).toBeDisabled()
  reject(new ApiError('Lago indisponível', 503, 'UNAVAILABLE'))
  expect(await screen.findByText('Lago indisponível')).toBeVisible()
  await waitFor(() => expect(button).toBeEnabled())
  await user.click(button)
  expect(await screen.findByRole('status')).toHaveTextContent('Truta')
})
it.each([{ active: false, fichas: 20 }, { active: true, fichas: 1 }])('bloqueia lançamento sem disponibilidade ou saldo: %j', async overrides => {
  vi.mocked(gamesApi.fishing).mockResolvedValue({ ...state, ...overrides })
  mount()
  await screen.findByText('Nível 3')
  expect(screen.getByRole('button', { name: 'Lançar a linha' })).toBeDisabled()
  expect(gamesApi.cast).not.toHaveBeenCalled()
})
it.each([0, -1, 1.5, 1000, 7])('bloqueia compra com quantidade inválida ou sem saldo: %s', async quantity => {
  mount()
  await screen.findByRole('heading', { name: 'Minhoca' })
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: quantity } })
  for (const button of screen.getAllByRole('button', { name: /Comprar/ })) expect(button).toBeDisabled()
  expect(programsApi.buyBait).not.toHaveBeenCalled()
})
it('compra a quantidade escolhida e atualiza estoque', async () => {
  const user = mount()
  await screen.findByRole('heading', { name: 'Minhoca' })
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: 2 } })
  await user.click(screen.getByRole('button', { name: 'Comprar · 6 fichas' }))
  expect(programsApi.buyBait).toHaveBeenCalledWith('bait', 2)
  await waitFor(() => expect(programsApi.fishing).toHaveBeenCalledTimes(2))
})
it('apresenta loja vazia e histórico de lançamentos', async () => {
  vi.mocked(programsApi.fishing).mockResolvedValue({ baits: [], collection: [] })
  vi.mocked(gamesApi.fishing).mockResolvedValue({ ...state, recent: [{ success: true, fish: 'Truta', created_at: '2026-09-02' }, { success: false, fish: null, created_at: '2026-09-01' }] })
  mount()
  expect(await screen.findByText('Nenhuma isca à venda no momento.')).toBeVisible()
  expect(screen.getByText('Truta · 2026-09-02')).toBeVisible()
  expect(screen.getByText('O peixe escapou · 2026-09-01')).toBeVisible()
})
it('falha de consulta bloqueia lançamento e mostra erro', async () => {
  vi.mocked(programsApi.fishing).mockRejectedValue(new ApiError('Falha no estoque', 503, 'UNAVAILABLE'))
  mount()
  expect(await screen.findByText('Falha no estoque')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Lançar a linha' })).toBeDisabled()
})
