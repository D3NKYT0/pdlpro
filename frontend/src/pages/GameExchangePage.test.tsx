// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { commerceApi, lineageApi } from '../services/api'
import i18n from '../i18n'
import { GameExchangePage } from './GameExchangePage'

beforeEach(async () => {
  await i18n.changeLanguage('pt')
  vi.spyOn(lineageApi, 'accounts').mockResolvedValue({ accounts: [{ login: 'hero' }] } as never)
  vi.spyOn(lineageApi, 'characters').mockResolvedValue([
    { char_id: 1, name: 'OnlineHero', online: true, class_id: 0, sex: 0 },
    { char_id: 2, name: 'OfflineHero', online: false, class_id: 0, sex: 0 },
  ] as never)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function renderPage(enabled: boolean, rates: { multiplier?: string; game_units_per_coin?: string } = {}) {
  vi.spyOn(commerceApi, 'exchangeState').mockResolvedValue({
    enabled: true, allow_online_delivery: enabled, unavailable_reason: '',
    coin: { name: 'Coin', item_id: 57, game_units_per_coin: '1', withdraw_fee_percent: '0', ...rates }, history: [],
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><GameExchangePage /></MemoryRouter></QueryClientProvider>)
}

it.each([false, true])('respeita envio online=%s e bloqueia retirada online', async enabled => {
  const user = userEvent.setup()
  renderPage(enabled)
  await screen.findByRole('option', { name: 'hero' })
  await user.selectOptions(screen.getByLabelText('Conta Lineage'), 'hero')
  const online = await screen.findByRole('option', { name: /OnlineHero/ })
  expect(online).toHaveProperty('disabled', !enabled)
  expect(screen.getByRole('option', { name: 'OfflineHero' })).not.toBeDisabled()
  if (enabled) await user.selectOptions(screen.getByLabelText('Personagem'), '1')
  await user.selectOptions(screen.getByLabelText('Operação'), 'from_game')
  expect(online).toBeDisabled()
  expect(screen.getByLabelText('Personagem')).toHaveValue('')
})

it('digitar a quantidade depois de limpar o campo não deixa zero à esquerda', async () => {
  const user = userEvent.setup()
  renderPage(true)
  await screen.findByRole('option', { name: 'hero' })
  const input = screen.getByLabelText('Quantidade de moedas no jogo') as HTMLInputElement
  await user.clear(input)
  expect(input.value).toBe('')
  await user.type(input, '2500')
  expect(input.value).toBe('2500')
})

it('calcula o saldo pela taxa do jogo, não pela taxa de compra', async () => {
  const user = userEvent.setup()
  const exchange = vi.spyOn(commerceApi, 'exchange').mockResolvedValue({ status: 'completed' } as never)
  renderPage(true, { multiplier: '100.00', game_units_per_coin: '1.00' })
  await screen.findByRole('option', { name: 'hero' })
  await screen.findByText(/= 1 unidade/)
  await user.selectOptions(screen.getByLabelText('Conta Lineage'), 'hero')
  await screen.findByRole('option', { name: /OnlineHero/ })
  await user.selectOptions(screen.getByLabelText('Personagem'), '1')
  const input = screen.getByLabelText('Quantidade de moedas no jogo')
  await user.clear(input)
  await user.type(input, '2500')
  expect(screen.getByText('Saldo a debitar').parentElement).toHaveTextContent(/^Saldo a debitar2\.500$/)
  await user.click(screen.getByRole('button', { name: 'Revisar transferência' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }))
  await waitFor(() => expect(exchange).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2500 })))
})

it('mostra a conversão quando a taxa do jogo é maior que 1', async () => {
  const user = userEvent.setup()
  renderPage(true, { game_units_per_coin: '100.00' })
  await screen.findByText(/= 100 unidade/)
  const input = screen.getByLabelText('Quantidade de moedas no jogo')
  await user.clear(input)
  await user.type(input, '250000')
  expect(screen.getByText('Saldo a debitar').parentElement).toHaveTextContent(/^Saldo a debitar2\.500$/)
  await user.selectOptions(screen.getByLabelText('Conta Lineage'), 'hero')
  await screen.findByRole('option', { name: /OnlineHero/ })
  await user.selectOptions(screen.getByLabelText('Personagem'), '1')
  await user.click(screen.getByRole('button', { name: 'Revisar transferência' }))
  expect(screen.getByText(/Confirme a transferência de 250\.000 moedas/)).toHaveTextContent('Débito de 2.500 no saldo')
})

it('preserva a fração real do saldo no histórico em vez de escondê-la', async () => {
  vi.spyOn(commerceApi, 'exchangeState').mockResolvedValue({
    enabled: true, allow_online_delivery: true, unavailable_reason: '',
    coin: { name: 'Coin', item_id: 57, game_units_per_coin: '1.00', withdraw_fee_percent: '0' },
    history: [
      { id: 'a', request_key: 'a', direction: 'to_game', login: 'hero', character_id: 1, character_name: 'Hero', item_id: 57, quantity: 250000, amount: '2500.00', fee: '0.00', status: 'completed', message: '', created_at: '2026-11-01T12:00:00Z' },
      { id: 'b', request_key: 'b', direction: 'from_game', login: 'hero', character_id: 1, character_name: 'Hero', item_id: 57, quantity: 10107, amount: '101.07', fee: '0.00', status: 'completed', message: '', created_at: '2026-11-01T12:00:00Z' },
    ],
  } as never)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><GameExchangePage /></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByRole('cell', { name: '250.000' })).toBeVisible()
  expect(screen.getByRole('cell', { name: '2.500' })).toBeVisible()
  expect(screen.getByRole('cell', { name: '101,07' })).toBeVisible()
})

it('envia ao personagem online com confirmação e bloqueia cliques duplicados', async () => {
  const user = userEvent.setup()
  let finish!: (value: never) => void
  const exchange = vi.spyOn(commerceApi, 'exchange').mockReturnValue(new Promise(resolve => { finish = resolve }))
  renderPage(true)
  await screen.findByRole('option', { name: 'hero' })
  await user.selectOptions(screen.getByLabelText('Conta Lineage'), 'hero')
  await screen.findByRole('option', { name: /OnlineHero/ })
  await user.selectOptions(screen.getByLabelText('Personagem'), '1')
  await user.click(screen.getByRole('button', { name: 'Revisar transferência' }))
  const confirm = screen.getByRole('button', { name: 'Confirmar transferência' })
  await user.dblClick(confirm)
  expect(exchange).toHaveBeenCalledTimes(1)
  expect(exchange).toHaveBeenCalledWith(expect.objectContaining({ direction: 'to_game', login: 'hero', character_id: 1, quantity: 1, request_key: expect.any(String) }))
  expect(screen.getByRole('button', { name: /processando/i })).toBeDisabled()
  finish({ status: 'completed' } as never)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar transferência' })).toBeEnabled())
})
