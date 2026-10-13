// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { staffApi, commerceApi, shopApi, programsApi, staffGameContentApi, customItemsApi } from '../../services/api'
import { AdminNewsPage } from './AdminNewsPage'
import { AdminShopPage } from './AdminShopPage'
import { AdminGamesPage } from './AdminGamesPage'
import { AdminCommercePage } from './AdminCommercePage'
import { AdminGameContentPage } from './AdminGameContentPage'
import { AdminCustomItemsPage } from './AdminCustomItemsPage'

vi.mock('../../hooks/useItemCatalog', () => ({ useItemCatalog: () => ({ getById: () => undefined, search: () => [], items: [], isLoading: false }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin' } }) }))
beforeEach(async () => { await i18n.changeLanguage('pt'); vi.spyOn(window, 'confirm').mockReturnValue(true) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function mount(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter>{page}</MemoryRouter></QueryClientProvider>)
  return client
}

it('removes a published news from the actual library and refreshes public queries', async () => {
  const row = { id: 'news', title: 'Publicada', title_en: '', title_es: '', excerpt: '', excerpt_en: '', excerpt_es: '', body: '<p>Texto</p>', body_en: '', body_es: '', slug: 'publicada', is_published: true, published_at: null }
  const list = vi.spyOn(staffApi, 'news').mockResolvedValueOnce([row]).mockResolvedValue([])
  vi.spyOn(staffApi, 'deleteNews').mockResolvedValue({ deleted: true })
  const client = mount(<AdminNewsPage />)
  client.setQueryData(['news'], [row])
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir Publicada' }))
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  expect(staffApi.deleteNews).toHaveBeenCalledWith('news')
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Excluir Publicada' })).not.toBeInTheDocument())
  expect(client.getQueryState(['news'])?.isInvalidated).toBe(true)
  client.clear()
})

it('offers deletion for store items', async () => {
  vi.spyOn(staffApi, 'shop').mockResolvedValue([{ id: 'item', name: 'Adena', item_id: 57, price: '1', quantity: 1, active: true }])
  vi.spyOn(commerceApi, 'staffPackages').mockResolvedValue([])
  vi.spyOn(staffApi, 'deleteShopItem').mockResolvedValue({ deleted: true })
  const client = mount(<AdminShopPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir Adena' }))
  await waitFor(() => expect(staffApi.deleteShopItem).toHaveBeenCalledWith('item'))
  client.clear()
})

it('offers deletion for game configurations', async () => {
  vi.spyOn(staffApi, 'games').mockResolvedValue([{ id: 'game', code: 'custom', name: 'Custom', active: true, settings: {} }])
  vi.spyOn(staffApi, 'deleteGame').mockResolvedValue({ deleted: true })
  const client = mount(<AdminGamesPage />)
  client.setQueryData(['roulette'], { prizes: [] })
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir Custom' }))
  await waitFor(() => expect(staffApi.deleteGame).toHaveBeenCalledWith('game'))
  await waitFor(() => expect(client.getQueryState(['roulette'])?.isInvalidated).toBe(true))
  client.clear()
})

it('offers deletion for commerce packages and coupons', async () => {
  vi.spyOn(commerceApi, 'staffPackages').mockResolvedValue([{ id: 'pack', name: 'Pacote', total_price: '1', active: true, contents: [] }])
  vi.spyOn(commerceApi, 'staffPromos').mockResolvedValue([{ id: 'promo', code: 'CUPOM', percent: '10', active: true, starts_at: null, ends_at: null, max_uses: 0, uses: 0, supporter: null }])
  vi.spyOn(shopApi, 'catalog').mockResolvedValue([])
  vi.spyOn(programsApi, 'staffSupporters').mockResolvedValue({ supporters: [], payouts: [] })
  vi.spyOn(commerceApi, 'remove').mockResolvedValue({ deleted: true })
  const client = mount(<AdminCommercePage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir Pacote' }))
  await waitFor(() => expect(commerceApi.remove).toHaveBeenCalledWith('packages', 'pack'))
  await userEvent.click(screen.getByRole('button', { name: 'Cupons' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir CUPOM' }))
  await waitFor(() => expect(commerceApi.remove).toHaveBeenCalledWith('promos', 'promo'))
  client.clear()
})

it('offers deletion for game content', async () => {
  vi.spyOn(staffGameContentApi, 'configs').mockImplementation(async kind => kind === 'seasons' ? [{ id: 'season', name: 'Temporada', active: false }] : [])
  vi.spyOn(staffGameContentApi, 'deleteConfig').mockResolvedValue({ deleted: true })
  const client = mount(<AdminGameContentPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir Temporada' }))
  await waitFor(() => expect(staffGameContentApi.deleteConfig).toHaveBeenCalledWith('seasons', 'season'))
  client.clear()
})

it('offers custom metadata deletion only with its specific permission', async () => {
  vi.spyOn(customItemsApi, 'list').mockResolvedValue({ results: [{ id: 'custom', item_id: 999999, name: 'Custom item', icon_url: null, category: 'COMUM', grade: 'NG', tradeable: true, active: true, metadata: {}, conflicts_with_xml: false }], count: 1, page: 1, pages: 1, permissions: { add: false, change: false, delete: true }, categories: [], grades: [] })
  vi.spyOn(customItemsApi, 'remove').mockResolvedValue({ deleted: true })
  const client = mount(<AdminCustomItemsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir Custom item' }))
  await waitFor(() => expect(customItemsApi.remove).toHaveBeenCalledWith('custom'))
  client.clear()
})

it('shows loading, a query error, retry and an empty news library', async () => {
  let reject!: (error: Error) => void
  vi.spyOn(staffApi, 'news').mockImplementationOnce(() => new Promise((_, fail) => { reject = fail })).mockResolvedValue([])
  const client = mount(<AdminNewsPage />)
  expect(screen.getByRole('status')).toBeVisible()
  reject(new Error('Falha na consulta'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha na consulta')
  await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  expect(screen.queryByRole('button', { name: /^Excluir/ })).not.toBeInTheDocument()
  client.clear()
})
