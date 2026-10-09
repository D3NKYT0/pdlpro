// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { serverApi } from '../../services/api'
import i18n from '../../i18n'
import { setCoinName } from '../../i18n/currency'
import { formatCoins, formatCurrency } from '../../lib/formatters'
import { CoinNameSync } from './CoinNameSync'
import { WalletHero } from './WalletHero'
import { BuyTokensModal } from '../games/BuyTokensModal'

vi.mock('../../services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return { ...actual, serverApi: { ...actual.serverApi, info: vi.fn() } }
})
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  setCoinName(i18n, '')
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(async () => {
  cleanup(); client.clear(); setCoinName(i18n, ''); await i18n.changeLanguage('pt')
})
function Commerce() {
  const { t } = useTranslation('panel')
  const [amount, setAmount] = useState('5')
  return <><WalletHero balance="100.00" bonusBalance="10.00" />
    <p>{t('shop.coins', { value: '12.00' })}</p>
    <p>{formatCoins('15.25')}</p><p>{formatCurrency('25.00')}</p>
    <BuyTokensModal open tokens={0} amount={amount} onAmountChange={setAmount} onConfirm={e => e.preventDefault()} onClose={() => {}} />
  </>
}
function mount() {
  render(<QueryClientProvider client={client}><MemoryRouter><CoinNameSync /><Commerce /></MemoryRouter></QueryClientProvider>)
}
it('propaga a configuração pública a saldos, preços e compra de fichas e atualiza sem recarregar', async () => {
  vi.mocked(serverApi.info).mockResolvedValue({ coin_name: 'Blablabla Coin' } as any)
  mount()
  expect(await screen.findByText('12.00 Blablabla Coin')).toBeVisible()
  expect(screen.getByText('15,25 Blablabla Coin')).toBeVisible()
  expect(screen.getByText('Blablabla Coin', { selector: '.wallet-balance-copy strong span' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Comprar · 5,00 Blablabla Coin' })).toBeVisible()
  await userEvent.setup().click(screen.getByRole('button', { name: /^25 fichas$/ }))
  expect(screen.getByRole('button', { name: 'Comprar · 25,00 Blablabla Coin' })).toBeVisible()
  expect(screen.getByText(/R\$.*25,00/)).toBeVisible()
  act(() => client.setQueryData(['server-info'], { coin_name: 'Cliente B Coin' }))
  expect(await screen.findByText('12.00 Cliente B Coin')).toBeVisible()
  expect(screen.queryByText('15,25 Blablabla Coin')).not.toBeInTheDocument()
})
it.each(['pt', 'en', 'es'])('nome personalizado permanece literal no idioma %s e limpar restaura tradução', async lang => {
  await i18n.changeLanguage(lang)
  vi.mocked(serverApi.info).mockResolvedValue({ coin_name: 'Blablabla Coin' } as any)
  mount()
  await screen.findByText('12.00 Blablabla Coin')
  await act(async () => { await i18n.changeLanguage(lang === 'en' ? 'es' : 'en') })
  expect(screen.getByText('12.00 Blablabla Coin')).toBeVisible()
  act(() => client.setQueryData(['server-info'], { coin_name: '' }))
  await waitFor(() => expect(screen.queryByText('12.00 Blablabla Coin')).not.toBeInTheDocument())
  expect(formatCoins(1)).toBe(lang === 'en' ? '1,00 monedas' : '1.00 coins')
})
it.each(['pending', 'error', 'missing'])('sem configuração mantém o fallback durante %s', async state => {
  if (state === 'pending') vi.mocked(serverApi.info).mockReturnValue(new Promise(() => {}))
  else if (state === 'error') vi.mocked(serverApi.info).mockRejectedValue(new Error('Offline'))
  else vi.mocked(serverApi.info).mockResolvedValue({} as any)
  mount()
  expect(screen.getByText('15,25 moedas')).toBeVisible()
  if (state === 'error') await waitFor(() => expect(client.getQueryState(['server-info'])?.status).toBe('error'))
})
