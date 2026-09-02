// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { ApiError, gamesApi, inventoryApi, lineageApi } from '../services/api'
import { InventoryPage } from './InventoryPage'

vi.mock('../components/ItemIcon', () => ({ ItemIcon: () => null }))
vi.mock('../lib/item-icons', () => ({ useItemCatalog: () => ({ isPending: false, isError: false, getById: (id: string) => id === '57' ? { id: '57', name: 'Adena', grade: 'NG' } : null, search: () => [] }) }))
vi.mock('../services/domain/lineage.service', () => ({ lineageApi: { accounts: vi.fn(), characters: vi.fn() }, inventoryApi: { dashboard: vi.fn(), gameItems: vi.fn(), withdraw: vi.fn(), deposit: vi.fn(), trade: vi.fn() } }))
vi.mock('../services/domain/games.service', () => ({ gamesApi: { bag: vi.fn(), transferBag: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let client: QueryClient
const accountData = { accounts: [{ login: 'main', is_primary: true }, { login: 'alt', is_primary: false }], slots: { used: 2, total: 3, can_link: true }, primary: {} }
const character = { char_id: 7, name: 'Elf', level: 80 }
const bag = { inventory_id: 'bag', account_name: 'main', character_name: 'Elf', character, items: [{ id: 'item', inventory_id: 'bag', item_id: 57, item_name: 'Adena', enchant: 3, quantity: 10 }] }
const destination = { inventory_id: 'dest', account_name: 'alt', character_name: 'Orc', character: { ...character, char_id: 8, name: 'Orc' }, items: [] }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(lineageApi.accounts).mockResolvedValue(accountData as any)
  vi.mocked(lineageApi.characters).mockResolvedValue([character] as any)
  vi.mocked(inventoryApi.dashboard).mockImplementation(async login => (login === 'alt' ? [destination] : [bag]) as Awaited<ReturnType<typeof inventoryApi.dashboard>>)
  vi.mocked(inventoryApi.gameItems).mockResolvedValue([{ item_id: 57, name: 'Adena do jogo', enchant: 0, quantity: 100, tradeable: true }])
  vi.mocked(gamesApi.bag).mockResolvedValue([{ item_id: 57, item_name: 'Recompensa', enchant: 0, quantity: 2 }] as any)
  vi.mocked(gamesApi.transferBag).mockResolvedValue({ moved: 2 })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear() })
function mount() {
  render(<QueryClientProvider client={client}><InventoryPage /></QueryClientProvider>)
  return userEvent.setup()
}
it.each([false, true])('retirada informa conta, personagem, item e quantidade; erro=%s', async fail => {
  if (fail) vi.mocked(inventoryApi.withdraw).mockRejectedValue(new ApiError('Personagem online', 409, 'ONLINE'))
  const user = mount()
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Personagem' }), '7')
  const input = screen.getByRole('textbox', { name: 'Quantidade' })
  await user.clear(input)
  await user.type(input, '3')
  await user.click(screen.getByRole('button', { name: 'Retirar do jogo' }))
  expect(inventoryApi.withdraw).toHaveBeenCalledWith({ login: 'main', char_id: 7, item_id: 57, quantity: 3 })
  if (fail) expect(toast.error).toHaveBeenCalledWith('Personagem online')
  else expect(toast.success).toHaveBeenCalledWith('Item retirado para o painel')
})
it.each([false, true])('depósito mantém item, enchant e conta de origem; erro=%s', async fail => {
  if (fail) vi.mocked(inventoryApi.deposit).mockRejectedValue(new ApiError('Entrega indisponível', 503, 'UNAVAILABLE'))
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Enviar ao jogo' }))
  const quantity = screen.getByRole('spinbutton', { name: 'Quantidade' })
  await user.clear(quantity)
  await user.type(quantity, '2')
  await user.click(screen.getByRole('button', { name: 'Enviar para Elf' }))
  expect(inventoryApi.deposit).toHaveBeenCalledWith({ login: 'main', inventory_id: 'bag', item_id: 57, quantity: 2, enchant: 3 })
  if (fail) {
    expect(toast.error).toHaveBeenCalledWith('Entrega indisponível')
    expect(quantity).toHaveValue(2)
  } else expect(screen.queryByRole('button', { name: 'Enviar para Elf' })).not.toBeInTheDocument()
})
it.each([0, -1, 1.5, 11])('depósito recusa quantidade fora do estoque: %s', async quantity => {
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Enviar ao jogo' }))
  const input = screen.getByRole('spinbutton', { name: 'Quantidade' })
  fireEvent.change(input, { target: { value: quantity } })
  fireEvent.submit(input.closest('form')!)
  expect(inventoryApi.deposit).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalledWith('Informe uma quantidade válida para enviar ao jogo')
})
it.each([false, true])('transferência entre personagens exclui origem e preserva enchant; erro=%s', async fail => {
  if (fail) vi.mocked(inventoryApi.trade).mockRejectedValue(new ApiError('Transferência recusada', 409, 'CONFLICT'))
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Transferir' }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Conta de destino' }), 'alt')
  const select = screen.getByRole('combobox', { name: 'Personagem de destino' })
  expect(within(select).queryByRole('option', { name: /Elf/ })).not.toBeInTheDocument()
  await user.selectOptions(select, 'dest')
  await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }))
  expect(inventoryApi.trade).toHaveBeenCalledWith({ origin_inventory_id: 'bag', destination_inventory_id: 'dest', item_id: 57, quantity: 1, enchant: 3 })
  if (fail) expect(toast.error).toHaveBeenCalledWith('Transferência recusada')
  else expect(toast.success).toHaveBeenCalledWith('1x transferido para Orc')
})
it.each([false, true])('move recompensas para inventário selecionado; erro=%s', async fail => {
  if (fail) vi.mocked(gamesApi.transferBag).mockRejectedValue(new ApiError('Bag indisponível', 503, 'UNAVAILABLE'))
  const user = mount()
  await user.click(screen.getByRole('tab', { name: /Bag do site/ }))
  await screen.findByRole('option', { name: 'Orc — conta alt' })
  await user.selectOptions(screen.getByRole('combobox', { name: 'Personagem de destino' }), 'dest')
  await user.click(screen.getByRole('button', { name: 'Mover para o inventário' }))
  expect(gamesApi.transferBag).toHaveBeenCalledWith('dest')
  if (fail) expect(toast.error).toHaveBeenCalledWith('Bag indisponível')
  else {
    expect(toast.success).toHaveBeenCalledWith('2 itens movidos para o inventário de Orc')
    expect(await screen.findByRole('combobox', { name: 'Conta Lineage' })).toHaveValue('alt')
  }
})
it('consulta paginada filtra por ID e bloqueia seleção de item não negociável', async () => {
  vi.mocked(inventoryApi.gameItems).mockResolvedValue(Array.from({ length: 9 }, (_, index) => ({ item_id: 100 + index, name: `Item ${index}`, enchant: index, quantity: 1, tradeable: index !== 0 })))
  const user = mount()
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Personagem' }), '7')
  const table = await screen.findByRole('table', { name: 'Itens no personagem' })
  expect(within(table).getAllByRole('row')).toHaveLength(9)
  expect(within(table).getAllByRole('button')[0]).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Próxima página' }))
  expect(within(table).getByText('Item 8')).toBeVisible()
  await user.type(screen.getByRole('searchbox', { name: 'Buscar item no personagem' }), '105')
  expect(within(table).getByText('Item 5')).toBeVisible()
  expect(within(table).queryByText('Item 8')).not.toBeInTheDocument()
})
it('troca de conta limpa personagem anterior e não consulta seus itens na nova conta', async () => {
  const user = mount()
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Personagem' }), '7')
  await screen.findByText('Adena do jogo')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Conta Lineage' }), 'alt')
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Personagem' })).toHaveValue(''))
  expect(inventoryApi.gameItems).not.toHaveBeenCalledWith(7, 'alt')
})
it('falha ao consultar itens é apresentada ao jogador', async () => {
  vi.mocked(inventoryApi.gameItems).mockRejectedValue(new ApiError('Falha', 503, 'UNAVAILABLE'))
  const user = mount()
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Personagem' }), '7')
  expect(await screen.findByText('Não foi possível carregar os itens. Use Atualizar e tente novamente.')).toBeVisible()
})
