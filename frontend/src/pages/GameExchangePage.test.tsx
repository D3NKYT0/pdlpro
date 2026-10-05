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

function renderPage(enabled: boolean) {
  vi.spyOn(commerceApi, 'exchangeState').mockResolvedValue({
    enabled: true, allow_online_delivery: enabled, unavailable_reason: '',
    coin: { name: 'Coin', item_id: 57, multiplier: '1', withdraw_fee_percent: '0' }, history: [],
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
