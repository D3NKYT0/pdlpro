// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiError, gamesApi } from '../../services/api'
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
  cost: 2,
  fichas: 20,
  rod: { level: 3, xp: 40 },
  fish: [],
  recent: [{ success: true, fish: 'Dourado', created_at: '2026-09-13T16:05:51.000Z' }],
}
const details = {
  baits: [
    { id: 'bait', name: 'Minhoca', description: 'Isca especial', quantity: 1, price: 3, success_bonus: 10 },
    { id: 'empty', name: 'Mosca', description: '', quantity: 0, price: 5, success_bonus: 20 },
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
    fichas: 18,
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

it('exibe coleção e lista somente iscas em estoque para lançar', async () => {
  mount()
  expect(await screen.findByRole('heading', { name: 'Raro' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Épico' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Divino' })).toBeVisible()
  expect(screen.getByText('1 captura')).toBeVisible()
  expect(screen.getAllByText('Ainda não descoberto')).toHaveLength(2)
  expect(document.querySelector('[data-side="left"] .fishing-tier[data-rarity="rare"]')).toBeTruthy()
  expect(document.querySelector('[data-side="right"] .fishing-tier[data-rarity="epic"]')).toBeTruthy()
  expect(document.querySelector('[data-side="right"] .fishing-tier[data-rarity="divine"] .fishing-fish[data-fish="serafim"]')).toBeTruthy()
  expect(document.querySelector('[data-side="left"] .fishing-tier[data-rarity="epic"]')).toBeNull()
  expect(screen.getAllByRole('option')).toHaveLength(2)
  expect(screen.getByText('Nível 3')).toBeVisible()
  expect(document.querySelector('.fishing-pond.is-idle')).toBeTruthy()
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
    fichas: 18,
  })
  const user = mount()
  await screen.findByText('Nível 3')
  await user.selectOptions(screen.getByLabelText(/Isca/), 'bait')
  await user.click(screen.getByRole('button', { name: 'Lançar a linha' }))
  expect(gamesApi.cast).toHaveBeenCalledWith('bait')
  expect(
    await screen.findByText(success ? 'Você pescou Truta!' : 'O peixe escapou. Tente novamente.'),
  ).toBeVisible()
  expect(document.querySelector('.fishing-pond.is-idle')).toBeTruthy()
  expect(document.querySelector('.fishing-catch')).toBeNull()
  expect(document.querySelector('.fishing-school .fishing-swimmer')).toBeTruthy()
})

it('compra isca e atualiza o estoque', async () => {
  const user = mount()
  await screen.findByText('Minhoca')
  const input = screen.getByDisplayValue('1')
  fireEvent.change(input, { target: { value: '2' } })
  expect(gamesApi.buyBait).not.toHaveBeenCalled()
  await user.click(screen.getAllByRole('button', { name: /Comprar/i })[0])
  expect(gamesApi.buyBait).toHaveBeenCalledWith('bait', 2)
  await waitFor(() => expect(gamesApi.fishingDetails).toHaveBeenCalledTimes(2))
})

it('mostra vazio quando não há iscas', async () => {
  vi.mocked(gamesApi.fishingDetails).mockResolvedValue({ baits: [], collection: [] })
  mount()
  expect(await screen.findByText(/Nenhuma isca à venda/i)).toBeVisible()
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
