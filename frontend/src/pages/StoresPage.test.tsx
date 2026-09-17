// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { serverApi } from '../services/api'
import { StoresPage } from './StoresPage'

vi.mock('../components/ItemIcon', () => ({ ItemIcon: () => null }))
vi.mock('../services/domain/server.service', () => ({
  serverApi: { stores: vi.fn() },
}))

const store = {
  char_id: 9,
  name: 'Trader',
  store_type: 'sell',
  title: 'Swords',
  clan_name: 'Guild',
  town: 'giran',
  x: 83400,
  y: 147943,
  z: -3404,
  sex: 1,
  race: 'human',
  items: [
    { item_id: 2, name: 'Long Sword', quantity: 1, price: 15000, enchant: 7 },
  ],
}

let client: QueryClient

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(serverApi.stores).mockResolvedValue({ available: true, stores: [store] })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  cleanup()
  client.clear()
})

function mount() {
  render(
    <QueryClientProvider client={client}>
      <StoresPage />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

it('lista lojas offline com item, preço e cidade', async () => {
  mount()
  expect(await screen.findByRole('heading', { level: 1, name: 'Lojas do jogo' })).toBeVisible()
  expect(await screen.findByRole('heading', { name: 'Trader' })).toBeVisible()
  expect(screen.getByText('Swords')).toBeVisible()
  expect(screen.getByText('Long Sword')).toBeVisible()
  expect(screen.getByText('+7')).toBeVisible()
  expect(screen.getByText('15K adena')).toBeVisible()
  expect(screen.getByText('Giran')).toBeVisible()
  expect(screen.getByText('X 83400 · Y 147943 · Z -3404')).toBeVisible()
  expect(screen.getByRole('img', { name: 'Trader, humano mulher' })).toHaveAttribute('src', '/theme/avatars/human-f.png')
  expect(serverApi.stores).toHaveBeenCalledWith('', '')
})

it('filtra por busca e tipo sem enviar de novo enquanto carrega', async () => {
  const user = mount()
  await screen.findByRole('heading', { name: 'Trader' })
  await user.type(screen.getByLabelText('Buscar item, vendedor ou vila'), 'sword')
  await user.selectOptions(screen.getByLabelText('Tipo'), 'sell')
  await waitFor(() => expect(serverApi.stores).toHaveBeenCalledWith('sword', 'sell'))
})

it('mostra vazio, erro e servidor sem vitrine', async () => {
  vi.mocked(serverApi.stores).mockResolvedValueOnce({ available: true, stores: [] })
  mount()
  expect(await screen.findByText('Nenhuma loja offline no momento.')).toBeVisible()
  cleanup()
  client.clear()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(serverApi.stores).mockResolvedValueOnce({ available: false, stores: [] })
  render(<QueryClientProvider client={client}><StoresPage /></QueryClientProvider>)
  expect(await screen.findByText('Este servidor ainda não publica lojas no painel.')).toBeVisible()
  cleanup()
  client.clear()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(serverApi.stores).mockRejectedValueOnce(new Error('boom'))
  render(<QueryClientProvider client={client}><StoresPage /></QueryClientProvider>)
  expect(await screen.findByText('Não foi possível carregar as lojas.')).toBeVisible()
})
