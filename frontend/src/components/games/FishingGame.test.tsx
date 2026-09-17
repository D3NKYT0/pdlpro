// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiError, gamesApi } from '../../services/api'
import type { FishingDetails } from '../../services/domain/games.service'
import { FishingGame } from './FishingGame'

vi.mock('../../services/domain/games.service', () => ({
  gamesApi: {
    fishing: vi.fn(),
    cast: vi.fn(),
    fishingDetails: vi.fn(),
    buyBait: vi.fn(),
  },
}))
vi.mock('./fishingReveal', () => ({
  FISHING_CAST_MS: 0,
  FISHING_BITE_MS: 0,
  FISHING_REVEAL_MS: 0,
  FISHING_TOTAL_MS: 0,
  waitForFishingCast: () => Promise.resolve(),
  waitForFishingBite: () => Promise.resolve(),
  waitForFishingReveal: () => Promise.resolve(),
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

let client: QueryClient
const state = {
  active: true,
  cost: 1,
  baits: 1,
  baits_per_token: 10,
  fichas: 20,
  rod: { level: 3, xp: 40 },
  fish: [],
  recent: [{ success: true, fish: 'Dourado', created_at: '2026-09-13T16:05:51.000Z' }],
}
const details: FishingDetails = {
  fichas: 20,
  baits_per_token: 10,
  baits: [
    { id: 'common', name: 'Isca comum', description: 'Isca simples', quantity: 1, price: 1, paid_with: 'tokens', success_bonus: 0 },
    { id: 'aprendiz', name: 'Isca do aprendiz', description: 'Chance extra', quantity: 0, price: 3, paid_with: 'baits', success_bonus: 5 },
    { id: 'encantada', name: 'Isca encantada', description: 'Atrai raros', quantity: 0, price: 8, paid_with: 'baits', success_bonus: 15 },
  ],
  collection: [
    { id: 'hidden', name: 'Carpa', rarity: 'epic', count: 0 },
    { id: 'fish', name: 'Truta', rarity: 'rare', count: 1 },
    { id: 'angel', name: 'Serafim de Eva', rarity: 'divine', count: 0 },
  ],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(gamesApi.fishing).mockResolvedValue(state)
  vi.mocked(gamesApi.fishingDetails).mockResolvedValue(details)
  vi.mocked(gamesApi.cast).mockResolvedValue({
    success: true,
    fish: { name: 'Truta', rarity: 'rare' },
    rod: state.rod,
    fichas: 20,
    baits: 0,
  })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
})

function mount() {
  render(
    <QueryClientProvider client={client}>
      <FishingGame />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

it('exibe coleção e deixa nome, bônus e custo das iscas visíveis', async () => {
  mount()
  expect(await screen.findByRole('heading', { name: 'Raro' }, { timeout: 5000 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Épico' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Divino' })).toBeVisible()
  expect(screen.getByText('1 captura')).toBeVisible()
  expect(screen.getAllByText('Ainda não descoberto')).toHaveLength(2)
  expect(document.querySelector('[data-side="left"] .fishing-tier[data-rarity="rare"]')).toBeTruthy()
  expect(document.querySelector('[data-side="right"] .fishing-tier[data-rarity="epic"]')).toBeTruthy()
  expect(document.querySelector('[data-side="right"] .fishing-tier[data-rarity="divine"] .fishing-fish[data-fish="serafim"]')).toBeTruthy()
  expect(document.querySelector('[data-side="left"] .fishing-tier[data-rarity="epic"]')).toBeNull()
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.getByText('Nível 3')).toBeVisible()
  expect(screen.getByText('Vara de carvalho')).toBeVisible()
  expect(screen.getByText('40 / 300 XP')).toBeVisible()
  expect(screen.getByText('1 isca')).toBeVisible()
  expect(screen.getAllByText('Isca comum').length).toBeGreaterThanOrEqual(1)
  expect(screen.getByText('Isca do aprendiz')).toBeVisible()
  expect(screen.getByText('Isca encantada')).toBeVisible()
  expect(screen.getByText(/\+0% · 1 ficha → 10 iscas/)).toBeVisible()
  expect(screen.getByText(/\+5% · 3 comuns → 1/)).toBeVisible()
  expect(screen.getByText(/\+15% · 8 comuns → 1/)).toBeVisible()
  expect(screen.getAllByText('Na linha').length).toBeGreaterThanOrEqual(1)
  expect(screen.getByText('Isca na linha')).toBeVisible()
  expect(screen.getByText('Lançar')).toBeVisible()
  expect(screen.getByRole('button', { name: /1 fichas → 10 iscas/i })).toBeEnabled()
  expect(screen.getByRole('button', { name: /3 iscas → 1 Isca do aprendiz/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: /8 iscas → 1 Isca encantada/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Usar Isca comum neste lançamento' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Isca do aprendiz — sem estoque para lançar' })).toBeDisabled()
  expect(document.querySelectorAll('.fishing-bait-rack .fishing-bait-frame')).toHaveLength(3)
  expect(document.querySelector('.fishing-bait-frame.ui-button')).toBeNull()
  expect(document.querySelector('.fishing-bait-mark[data-kind="common"]')).toBeTruthy()
  expect(document.querySelector('.fishing-bait-mark[data-kind="apprentice"]')).toBeTruthy()
  expect(document.querySelector('.fishing-bait-mark[data-kind="enchanted"]')).toBeTruthy()
  expect(document.querySelector('.fishing-play-pane .fishing-shop-bar')).toBeTruthy()
  expect(document.querySelector('.fishing-play-pane .fishing-bait-rack')).toBeTruthy()
  expect(document.querySelector('.fishing-cast-pane .fishing-cast-button')).toBeTruthy()
  expect(document.querySelector('.fishing-bait-frame.is-selected[data-kind="common"]')).toBeTruthy()
  expect(document.querySelector('.fishing-bait-frame.is-selected[data-kind="apprentice"]')).toBeNull()
  expect(document.querySelector('.fishing-board > .fishing-pond')).toBeTruthy()
  expect(document.querySelector('.fishing-stage .fishing-cast-button')).toBeTruthy()
  expect(document.querySelector('.fishing-pond.is-idle')).toBeTruthy()
  expect(document.querySelector('.fishing-pond[data-bait="common"][data-rod="3"]')).toBeTruthy()
  expect(document.querySelector('.fishing-pond .fishing-rod')).toBeTruthy()
  expect(document.querySelector('.fishing-stat-rod .fishing-rod-portrait')).toBeTruthy()
  expect(document.querySelector('.fishing-pond-caustic')).toBeTruthy()
  expect(document.querySelectorAll('.fishing-bubble').length).toBeGreaterThan(0)
  expect(document.querySelectorAll('.fishing-droplet').length).toBeGreaterThan(0)
  expect(document.querySelector('.fishing-school .fishing-swimmer[data-fish="lambari"]')).toBeTruthy()
  expect(document.querySelector('.fishing-collection-card .fishing-fish[data-fish="dourado"]')).toBeTruthy()
  expect(document.querySelector('.fishing-collection-card .fishing-fish.is-locked[data-fish="piraiba"]')).toBeTruthy()
  expect(document.querySelector('time[datetime="2026-09-13T16:05:51.000Z"]')).toBeTruthy()
  expect(screen.queryByText(/16:05:51\.000Z/)).toBeNull()
})

it.each([true, false])('lança com a última isca e apresenta captura=%s', async (success) => {
  vi.mocked(gamesApi.cast).mockResolvedValue({
    success,
    fish: { name: 'Truta', rarity: 'rare' },
    rod: state.rod,
    fichas: 20,
    baits: 0,
  })
  const user = mount()
  await screen.findByText('Nível 3')
  await user.click(screen.getByRole('button', { name: 'Lançar a linha' }))
  expect(gamesApi.cast).toHaveBeenCalledWith('common')
  expect(
    await screen.findByText(success ? 'Você pescou Truta!' : 'O peixe escapou. Tente novamente.'),
  ).toBeVisible()
  expect(document.querySelector('.fishing-pond.is-idle')).toBeTruthy()
  expect(document.querySelector('.fishing-catch')).toBeNull()
  expect(document.querySelector('.fishing-school .fishing-swimmer')).toBeTruthy()
})

it('escolhe a isca no quadro sem comprar e lança com ela', async () => {
  vi.mocked(gamesApi.fishingDetails).mockResolvedValue({
    ...details,
    baits: details.baits.map((row) =>
      row.id === 'aprendiz' ? { ...row, quantity: 2 } : row,
    ),
  })
  const user = mount()
  await screen.findByRole('button', { name: 'Usar Isca do aprendiz neste lançamento' })
  await user.click(screen.getByRole('button', { name: 'Usar Isca do aprendiz neste lançamento' }))
  expect(gamesApi.buyBait).not.toHaveBeenCalled()
  expect(document.querySelector('.fishing-bait-frame.is-selected[data-kind="apprentice"]')).toBeTruthy()
  expect(document.querySelector('.fishing-pond[data-bait="apprentice"]')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Lançar a linha' }))
  expect(gamesApi.cast).toHaveBeenCalledWith('aprendiz')
})

it('abre o guia da pescaria', async () => {
  const user = mount()
  await screen.findByRole('button', { name: 'Como funciona a pescaria' })
  expect(screen.queryByRole('dialog', { name: 'Como funciona a pescaria' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Como funciona a pescaria' }))
  const dialog = await screen.findByRole('dialog', { name: 'Como funciona a pescaria' })
  expect(dialog).toHaveTextContent('Fichas só compram isca comum')
  await user.click(screen.getByRole('button', { name: 'Entendi' }))
  expect(screen.queryByRole('dialog', { name: 'Como funciona a pescaria' })).not.toBeInTheDocument()
})

it('compra isca e atualiza o estoque', async () => {
  client.setQueryData(['roulette'], { fichas: 20, cost: 1 })
  vi.mocked(gamesApi.buyBait).mockResolvedValue({ fichas: 18, quantity: 21, received: 20 })
  const user = mount()
  await screen.findByRole('button', { name: /1 fichas → 10 iscas/i })
  const input = screen.getByDisplayValue('1')
  fireEvent.change(input, { target: { value: '2' } })
  expect(gamesApi.buyBait).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /2 fichas → 20 iscas/i }))
  expect(gamesApi.buyBait).toHaveBeenCalledWith('common', 2)
  await waitFor(() => expect(client.getQueryData(['roulette'])).toMatchObject({ fichas: 18 }))
  await waitFor(() => expect(gamesApi.fishingDetails).toHaveBeenCalledTimes(2))
})

it('troca iscas comuns pelas duas encantadas quando o estoque cobre o custo', async () => {
  vi.mocked(gamesApi.fishingDetails).mockResolvedValue({
    ...details,
    baits: details.baits.map((row) =>
      row.id === 'common' ? { ...row, quantity: 20 } : row,
    ),
  })
  const user = mount()
  expect(await screen.findByRole('button', { name: /3 iscas → 1 Isca do aprendiz/ })).toBeEnabled()
  expect(screen.getByRole('button', { name: /8 iscas → 1 Isca encantada/ })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: /3 iscas → 1 Isca do aprendiz/ }))
  expect(gamesApi.buyBait).toHaveBeenCalledWith('aprendiz', 1)
  await user.click(screen.getByRole('button', { name: /8 iscas → 1 Isca encantada/ }))
  expect(gamesApi.buyBait).toHaveBeenCalledWith('encantada', 1)
})

it('mostra vazio quando não há iscas', async () => {
  vi.mocked(gamesApi.fishingDetails).mockResolvedValue({
    baits: [],
    collection: [],
    fichas: 20,
    baits_per_token: 10,
  })
  mount()
  expect(await screen.findByText(/Nenhuma isca à venda/i)).toBeVisible()
  expect(await screen.findByText(/precisa de iscas para lançar/i)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Lançar a linha' })).toBeDisabled()
})

it('anuncia a vara nova quando o nível sobe', async () => {
  vi.mocked(gamesApi.cast).mockResolvedValue({
    success: true,
    fish: { name: 'Truta', rarity: 'rare' },
    rod: { level: 4, xp: 0 },
    fichas: 20,
    baits: 0,
  })
  const user = mount()
  await screen.findByText('Nível 3')
  await user.click(screen.getByRole('button', { name: 'Lançar a linha' }))
  expect(
    await screen.findByText('Você pescou Truta! A vara melhorou: Vara de bronze (nível 4).'),
  ).toBeVisible()
})

it('volta o lago ao repouso quando o lançamento falha', async () => {
  vi.mocked(gamesApi.cast).mockRejectedValue(new ApiError('Linha rompida', 400, 'CAST_FAILED'))
  const user = mount()
  await screen.findByText('Nível 3')
  await user.click(screen.getByRole('button', { name: 'Lançar a linha' }))
  expect(await screen.findByText('Linha rompida')).toBeVisible()
  expect(document.querySelector('.fishing-pond.is-idle')).toBeTruthy()
})

it('mostra erro quando o estoque falha', async () => {
  vi.mocked(gamesApi.fishingDetails).mockRejectedValue(
    new ApiError('Falha no estoque', 503, 'UNAVAILABLE'),
  )
  mount()
  expect(await screen.findByText('Falha no estoque')).toBeVisible()
})
