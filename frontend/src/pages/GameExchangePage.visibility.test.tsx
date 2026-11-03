// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { commerceApi, lineageApi } from '../services/api'
import i18n from '../i18n'
import { GameExchangePage } from './GameExchangePage'

const session: { user: { capabilities?: string[] } | null } = { user: null }
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))

beforeEach(async () => {
  await i18n.changeLanguage('pt')
  session.user = { capabilities: [] }
  vi.spyOn(lineageApi, 'accounts').mockResolvedValue({ accounts: [{ login: 'hero' }] } as never)
  vi.spyOn(lineageApi, 'characters').mockResolvedValue([] as never)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function renderPage(state: Partial<Awaited<ReturnType<typeof commerceApi.exchangeState>>> = {}) {
  vi.spyOn(commerceApi, 'exchangeState').mockResolvedValue({
    enabled: true, allow_online_delivery: false, allow_withdraw: true, unavailable_reason: '',
    coin: { name: 'Saga Coin', game_units_per_coin: '1', withdraw_fee_percent: '0' }, history: [],
    ...state,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><GameExchangePage /></MemoryRouter></QueryClientProvider>)
}

it('jogador vê o nome da moeda sem o ID do item', async () => {
  renderPage()
  expect(await screen.findByText('Moeda: Saga Coin')).toBeVisible()
  expect(screen.queryByText(/ID 65214/)).not.toBeInTheDocument()
})

it('equipe vê o ID do item da moeda', async () => {
  session.user = { capabilities: ['finance.manage'] }
  renderPage({ coin: { name: 'Item 65214', item_id: 65214, game_units_per_coin: '1', withdraw_fee_percent: '0' } })
  expect(await screen.findByText('Moeda: Item 65214 · ID 65214')).toBeVisible()
})

it.each([true, false])('opção de trazer moedas do jogo segue a configuração (ativa=%s)', async allowWithdraw => {
  renderPage({ allow_withdraw: allowWithdraw })
  await screen.findByText('Moeda: Saga Coin')
  expect(screen.queryByRole('option', { name: 'Trazer moedas do jogo' }) !== null).toBe(allowWithdraw)
})
