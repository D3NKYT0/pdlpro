// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import toast from 'react-hot-toast'
import { ApiError, auctionApi, inventoryApi, lineageApi, marketplaceApi } from '../services/api'
import type { ApiAuction, ApiCharacterListing } from '../services/types'
import { MarketplacePage } from './MarketplacePage'
import { AuctionPage } from './AuctionPage'

const session = vi.hoisted(() => ({ user: { username: 'buyer' } as { username: string } | null }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('../components/ItemIcon', () => ({ ItemIcon: () => null }))
vi.mock('../services/domain/marketplace.service', () => ({ marketplaceApi: { catalog: vi.fn(), mine: vi.fn(), list: vi.fn(), buy: vi.fn(), cancel: vi.fn() } }))
vi.mock('../services/domain/auction.service', () => ({ auctionApi: { open: vi.fn(), mine: vi.fn(), create: vi.fn(), bid: vi.fn() } }))
vi.mock('../services/domain/lineage.service', () => ({ lineageApi: { characters: vi.fn() }, inventoryApi: { dashboard: vi.fn(), equipment: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const listing: ApiCharacterListing = { id: 'listing', seller_username: 'seller', char_id: 7, char_name: 'Elf', char_level: 80, char_class: 99, char_title: 'Campeão', char_sex: 0, char_pvp: 40, char_pk: 0, char_clan_name: 'Reino', char_is_clan_leader: false, equipment: [{ item_id: 57, name: 'Adena', quantity: 10, enchant: 0, slot: 1 }], price: '150.25', status: 'for_sale', notes: 'Pronto para jogar', created_at: '2026-09-02T10:00:00Z', updated_at: '2026-09-02T10:00:00Z', sold_at: null }
const auction: ApiAuction = { id: 'auction', seller_id: 'seller', seller_username: 'seller', item_id: 57, item_name: 'Adena', item_enchant: 3, quantity: 10, min_bid: '10.00', current_bid: '12.00', highest_bidder_id: null, highest_bidder_username: null, character_name: 'Elf', ends_at: '2026-09-03T10:00:00Z', status: 'open', created_at: '2026-09-02T10:00:00Z', updated_at: '2026-09-02T10:00:00Z' }
const character = { char_id: 7, name: 'Elf', level: 80, class_id: 99, online: false, pvp: 40, pk: 0, clan_name: '', title: '' }
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-02T10:00:00Z').getTime())
  session.user = { username: 'buyer' }
  vi.mocked(marketplaceApi.catalog).mockResolvedValue([listing])
  vi.mocked(marketplaceApi.mine).mockResolvedValue([])
  vi.mocked(marketplaceApi.list).mockResolvedValue(listing)
  vi.mocked(marketplaceApi.buy).mockResolvedValue({ ...listing, status: 'sold' })
  vi.mocked(marketplaceApi.cancel).mockResolvedValue({ ...listing, status: 'cancelled' })
  vi.mocked(lineageApi.characters).mockResolvedValue([character] as Awaited<ReturnType<typeof lineageApi.characters>>)
  vi.mocked(inventoryApi.equipment).mockResolvedValue([])
  vi.mocked(inventoryApi.dashboard).mockResolvedValue([{ inventory_id: 'bag', character_name: 'Elf', items: [{ id: 'item', item_id: 57, item_name: 'Adena', enchant: 3, quantity: 10 }] }] as Awaited<ReturnType<typeof inventoryApi.dashboard>>)
  vi.mocked(auctionApi.open).mockResolvedValue([auction])
  vi.mocked(auctionApi.mine).mockResolvedValue([])
  vi.mocked(auctionApi.create).mockResolvedValue(auction)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks() })
function mount(page: ReactElement) {
  render(<QueryClientProvider client={client}>{page}</QueryClientProvider>)
  return userEvent.setup()
}
async function prepareListing(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: /Elf/ })
  await user.selectOptions(screen.getByRole('combobox', { name: 'Personagem' }), '7')
  await user.type(screen.getByRole('spinbutton', { name: 'Preço' }), '150.25')
  await user.click(screen.getByRole('textbox', { name: 'Descrição para o comprador' }))
  await user.paste('Pronto para jogar')
}
it.each([false, true])('marketplace compra e apresenta resultado; erro=%s', async fail => {
  if (fail) vi.mocked(marketplaceApi.buy).mockRejectedValue(new ApiError('Saldo insuficiente', 400, 'INSUFFICIENT'))
  const user = mount(<MarketplacePage />)
  await user.click(await screen.findByRole('button', { name: /Ver personagem/ }))
  expect(screen.getByText('Pronto para jogar')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Comprar personagem' }))
  expect(marketplaceApi.buy).toHaveBeenCalledWith('listing')
  if (fail) {
    expect(toast.error).toHaveBeenCalledWith('Saldo insuficiente')
    expect(screen.getByRole('button', { name: 'Comprar personagem' })).toBeEnabled()
  } else {
    expect(await screen.findByText('Vendido')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Comprar personagem' })).not.toBeInTheDocument()
  }
})
it.each([false, true])('dono pode cancelar e não comprar seu anúncio; erro=%s', async fail => {
  session.user = { username: 'seller' }
  if (fail) vi.mocked(marketplaceApi.cancel).mockRejectedValue(new ApiError('Venda em andamento', 409, 'CONFLICT'))
  const user = mount(<MarketplacePage />)
  await user.click(await screen.findByRole('button', { name: /Ver personagem/ }))
  expect(screen.queryByRole('button', { name: 'Comprar personagem' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar anúncio' }))
  expect(marketplaceApi.cancel).toHaveBeenCalledWith('listing')
  if (fail) expect(toast.error).toHaveBeenCalledWith('Venda em andamento')
  else expect(await screen.findByText('Cancelado')).toBeVisible()
})
it.each([false, true])('publica personagem com preço decimal; erro=%s', async fail => {
  if (fail) vi.mocked(marketplaceApi.list).mockRejectedValue(new ApiError('Personagem indisponível', 409, 'CONFLICT'))
  const user = mount(<MarketplacePage />)
  await prepareListing(user)
  await user.click(screen.getByRole('button', { name: 'Publicar anúncio' }))
  expect(marketplaceApi.list).toHaveBeenCalledWith({ char_id: 7, price: '150.25', notes: 'Pronto para jogar' })
  if (fail) {
    expect(toast.error).toHaveBeenCalledWith('Personagem indisponível')
    expect(screen.getByRole('spinbutton', { name: 'Preço' })).toHaveValue(150.25)
    expect(screen.getByRole('button', { name: 'Publicar anúncio' })).toBeEnabled()
  } else expect(screen.getByRole('combobox', { name: 'Personagem' })).toHaveValue('')
})
it('não repete publicação enquanto o servidor responde', async () => {
  vi.mocked(marketplaceApi.list).mockImplementation(() => new Promise(() => {}))
  const user = mount(<MarketplacePage />)
  await prepareListing(user)
  await user.dblClick(screen.getByRole('button', { name: 'Publicar anúncio' }))
  expect(marketplaceApi.list).toHaveBeenCalledTimes(1)
})
it('impede anunciar personagem online', async () => {
  vi.mocked(lineageApi.characters).mockResolvedValue([{ ...character, online: true }] as Awaited<ReturnType<typeof lineageApi.characters>>)
  const user = mount(<MarketplacePage />)
  await screen.findByRole('option', { name: /Elf/ })
  await user.selectOptions(screen.getByRole('combobox', { name: 'Personagem' }), '7')
  expect(screen.getByText('O personagem precisa estar offline para ser anunciado.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Publicar anúncio' })).toBeDisabled()
})
it('compra pendente bloqueia cliques duplicados', async () => {
  vi.mocked(marketplaceApi.buy).mockImplementation(() => new Promise(() => {}))
  const user = mount(<MarketplacePage />)
  await user.click(await screen.findByRole('button', { name: /Ver personagem/ }))
  await user.dblClick(screen.getByRole('button', { name: 'Comprar personagem' }))
  expect(marketplaceApi.buy).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Processando...' })).toBeDisabled()
})
it('visitante consulta catálogo sem carregar dados privados', async () => {
  session.user = null
  mount(<MarketplacePage />)
  await screen.findByRole('button', { name: /Ver personagem/ })
  expect(marketplaceApi.mine).not.toHaveBeenCalled()
  expect(lineageApi.characters).not.toHaveBeenCalled()
  expect(screen.getByText('Entre para vender ou comprar personagens.')).toBeVisible()
})
it.each([false, true])('lance envia decimal e personagem selecionado; erro=%s', async fail => {
  if (fail) vi.mocked(auctionApi.bid).mockRejectedValue(new ApiError('Lance ultrapassado', 409, 'CONFLICT'))
  const user = mount(<AuctionPage />)
  await user.click(await screen.findByRole('button', { name: /Ver leilão/ }))
  expect(screen.getByRole('spinbutton', { name: 'Seu lance' })).toHaveValue(12.01)
  expect(screen.getByRole('combobox', { name: 'Personagem que receberá o item' })).toHaveValue('Elf')
  await user.click(screen.getByRole('button', { name: 'Dar lance' }))
  expect(auctionApi.bid).toHaveBeenCalledWith('auction', '12.01', 'Elf')
  if (fail) expect(toast.error).toHaveBeenCalledWith('Lance ultrapassado')
  else await waitFor(() => expect(auctionApi.open).toHaveBeenCalledTimes(2))
})
it.each(['owner', 'finished'])('não permite lance para condição %s', async condition => {
  if (condition === 'owner') session.user = { username: 'seller' }
  else vi.mocked(auctionApi.open).mockResolvedValue([{ ...auction, status: 'finished' }])
  const user = mount(<AuctionPage />)
  await user.click(await screen.findByRole('button', { name: /Ver leilão/ }))
  expect(screen.queryByRole('button', { name: 'Dar lance' })).not.toBeInTheDocument()
})
it('não repete lance enquanto aguarda confirmação', async () => {
  vi.mocked(auctionApi.bid).mockImplementation(() => new Promise(() => {}))
  const user = mount(<AuctionPage />)
  await user.click(await screen.findByRole('button', { name: /Ver leilão/ }))
  await user.dblClick(screen.getByRole('button', { name: 'Dar lance' }))
  expect(auctionApi.bid).toHaveBeenCalledTimes(1)
})
it.each([false, true])('cria leilão do item/enchant e quantidade escolhidos; erro=%s', async fail => {
  if (fail) vi.mocked(auctionApi.create).mockRejectedValue(new ApiError('Estoque alterado', 409, 'CONFLICT'))
  const user = mount(<AuctionPage />)
  await screen.findByRole('option', { name: /Elf — 1 itens/ })
  await user.selectOptions(screen.getByRole('combobox', { name: 'Inventário do personagem' }), 'bag')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Item' }), '57:3')
  const quantity = screen.getByRole('spinbutton', { name: 'Quantidade' })
  expect(quantity).toHaveAttribute('max', '10')
  await user.clear(quantity)
  await user.type(quantity, '2')
  await user.type(screen.getByRole('spinbutton', { name: 'Lance inicial' }), '15.50')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Duração' }), '48')
  await user.click(screen.getByRole('button', { name: 'Publicar leilão' }))
  expect(auctionApi.create).toHaveBeenCalledWith({ inventory_id: 'bag', item_id: 57, quantity: 2, enchant: 3, min_bid: '15.5', hours: 48 })
  if (fail) {
    expect(toast.error).toHaveBeenCalledWith('Estoque alterado')
    expect(quantity).toHaveValue(2)
  } else expect(screen.getByRole('combobox', { name: 'Inventário do personagem' })).toHaveValue('')
})
