// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { serverApi } from '../services/api'
import { StoresPage } from './StoresPage'

vi.mock('../components/ItemIcon', () => ({
  ItemIcon: ({ itemId, name, className }: { itemId?: number | string; name?: string; className?: string }) => (
    <img alt={name || String(itemId)} data-item-id={String(itemId ?? '')} className={className} />
  ),
}))
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
  expect(screen.getByRole('heading', { name: 'Trader' }).closest('article')).toHaveAttribute('data-store-type', 'sell')
  expect(serverApi.stores).toHaveBeenCalledWith('', '')
})

it('pinta cada cartão com o tipo da loja', async () => {
  vi.mocked(serverApi.stores).mockResolvedValue({
    available: true,
    stores: [
      store,
      { ...store, char_id: 10, name: 'Buyer', store_type: 'buy' },
      { ...store, char_id: 11, name: 'Packer', store_type: 'package' },
      { ...store, char_id: 12, name: 'Smith', store_type: 'craft' },
    ],
  })
  mount()
  expect(await screen.findByRole('heading', { name: 'Trader' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Trader' }).closest('article')).toHaveAttribute('data-store-type', 'sell')
  expect(screen.getByRole('heading', { name: 'Buyer' }).closest('article')).toHaveAttribute('data-store-type', 'buy')
  expect(screen.getByRole('heading', { name: 'Packer' }).closest('article')).toHaveAttribute('data-store-type', 'package')
  expect(screen.getByRole('heading', { name: 'Smith' }).closest('article')).toHaveAttribute('data-store-type', 'craft')
  expect(document.querySelector('[data-store-type="sell"] .stores-type')).toHaveTextContent('Venda')
  expect(document.querySelector('[data-store-type="buy"] .stores-type')).toHaveTextContent('Compra')
  expect(document.querySelector('[data-store-type="package"] .stores-type')).toHaveTextContent('Pacote')
  expect(document.querySelector('[data-store-type="craft"] .stores-type')).toHaveTextContent('Craft')
})

it('mostra o ícone do resultado ao lado da receita nas lojas de craft', async () => {
  vi.mocked(serverApi.stores).mockResolvedValue({
    available: true,
    stores: [{
      ...store,
      name: 'Smith',
      store_type: 'craft',
      items: [{
        item_id: 4967,
        name: 'Recipe: Sword of Valhalla (60%)',
        quantity: 1,
        price: 2_200_000,
        enchant: 0,
        result_item_id: 148,
        result_name: 'Sword of Valhalla',
      }],
    }],
  })
  mount()
  expect(await screen.findByRole('heading', { name: 'Smith' })).toBeVisible()
  expect(screen.getByRole('img', { name: 'Recipe: Sword of Valhalla (60%)' })).toHaveAttribute('data-item-id', '4967')
  expect(screen.getByRole('img', { name: 'Resultado: Sword of Valhalla' })).toHaveAttribute('data-item-id', '148')
  expect(screen.getByRole('img', { name: 'Resultado: Sword of Valhalla' })).toHaveClass('stores-item-result')
})

it('filtra por busca e tipo sem disparar a API a cada tecla', async () => {
  const user = mount()
  await screen.findByRole('heading', { name: 'Trader' })
  expect(serverApi.stores).toHaveBeenCalledTimes(1)
  await user.type(screen.getByLabelText('Buscar item, vendedor ou vila'), 'sword')
  await user.selectOptions(screen.getByLabelText('Tipo'), 'sell')
  await waitFor(() => expect(serverApi.stores).toHaveBeenCalledWith('sword', 'sell'))
  expect(screen.getByLabelText('Tipo').closest('.public-faq-tools')).toHaveAttribute('data-store-filter', 'sell')
  const partials = vi.mocked(serverApi.stores).mock.calls.filter(
    ([query]) => query === 's' || query === 'sw' || query === 'swo' || query === 'swor',
  )
  expect(partials).toHaveLength(0)
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
