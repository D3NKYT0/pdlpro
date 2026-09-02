// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import toast from 'react-hot-toast'
import { ApiError, staffApi } from '../../services/api'
import { AdminCoinsPage } from './AdminCoinsPage'
import { AdminServicesPage } from './AdminServicesPage'
import { AdminGamesPage } from './AdminGamesPage'
import { AdminShopPage } from './AdminShopPage'
import { AdminNewsPage } from './AdminNewsPage'
import { AdminServerPage } from './AdminServerPage'
import { AdminAccountsPage } from './AdminAccountsPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../components/ItemIcon', () => ({ ItemIcon: () => null }))
vi.mock('../../lib/item-icons', () => ({ useItemCatalog: () => ({ isPending: false, isError: false, getById: (id: string) => id === '57' ? { id: '57', name: 'Adena', grade: 'NG' } : null, search: () => [] }) }))
vi.mock('../../services/domain/staff.service', () => ({ staffApi: { coins: vi.fn(), saveCoins: vi.fn(), services: vi.fn(), saveServices: vi.fn(), games: vi.fn(), saveGame: vi.fn(), shop: vi.fn(), saveShopItem: vi.fn(), news: vi.fn(), saveNews: vi.fn(), panel: vi.fn(), savePanel: vi.fn(), inspectAccount: vi.fn(), unlinkAccount: vi.fn() } }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.mocked(staffApi.coins).mockResolvedValue({ name: 'Adena', coin_id: 57, multiplier: '1.00', usd_multiplier: '5.00', withdraw_fee_percent: '0.00' } as any)
  vi.mocked(staffApi.services).mockResolvedValue([{ code: 'UNSTUCK', name: 'Destravar', price: '5.00', active: true }])
  vi.mocked(staffApi.games).mockResolvedValue([{ id: 'dice', code: 'dice', name: 'Dados', active: true, settings: {} }])
  vi.mocked(staffApi.shop).mockResolvedValue([{ id: 'item', name: 'Adena', item_id: 57, price: '5.00', quantity: 1, active: true }])
  vi.mocked(staffApi.news).mockResolvedValue([])
  vi.mocked(staffApi.panel).mockResolvedValue({ name: 'PDL', slogan: 'Reino', description: 'Servidor', chronicle: 'Interlude', rates: { xp: 'x10' }, enchant: {}, notes: {}, features: [], max_level: 80, coming_soon: false, staff_only_login: false } as any)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function mount(page: ReactElement) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{page}</MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it('moedas mantém precisão decimal na configuração', async () => {
  const user = mount(<AdminCoinsPage />)
  const input = await screen.findByRole('spinbutton', { name: /Conversão por USD/ })
  await waitFor(() => expect(input).toHaveValue(5))
  await user.clear(input)
  await user.type(input, '6.25')
  await user.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(staffApi.saveCoins).toHaveBeenCalledWith({ name: 'Adena', coin_id: 57, multiplier: '1.00', usd_multiplier: '6.25', withdraw_fee_percent: '0.00', active: true })
})

it.each([false, true])('serviços salva preço e disponibilidade; erro=%s', async fail => {
  if (fail) vi.mocked(staffApi.saveServices).mockRejectedValue(new ApiError('Não autorizado', 403, 'DENIED'))
  const user = mount(<AdminServicesPage />)
  const price = await screen.findByRole('spinbutton', { name: /Preço/ })
  await user.clear(price)
  await user.type(price, '12.34')
  await user.click(screen.getByRole('checkbox', { name: 'Disponível' }))
  await user.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(staffApi.saveServices).toHaveBeenCalledWith([{ code: 'UNSTUCK', name: 'Destravar', price: '12.34', active: false }])
  if (fail) expect(toast.error).toHaveBeenCalledWith('Não autorizado')
  else expect(toast.success).toHaveBeenCalledWith('Preços atualizados')
})

it.each([false, true])('jogos envia toggle e apresenta resultado; erro=%s', async fail => {
  if (fail) vi.mocked(staffApi.saveGame).mockRejectedValue(new ApiError('Falha ao salvar', 400, 'INVALID'))
  const user = mount(<AdminGamesPage />)
  await user.click(await screen.findByRole('checkbox', { name: 'Ativo' }))
  expect(staffApi.saveGame).toHaveBeenCalledWith({ id: 'dice', active: false })
  if (fail) expect(toast.error).toHaveBeenCalledWith('Falha ao salvar')
  else expect(toast.success).toHaveBeenCalledWith('Jogo desativado')
})

it('edição da loja preserva UUID e converte quantidade para número', async () => {
  const user = mount(<AdminShopPage />)
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  const quantity = screen.getByLabelText('Quantidade')
  await user.clear(quantity)
  await user.type(quantity, '3')
  await user.click(screen.getByRole('button', { name: 'Atualizar item' }))
  expect(staffApi.saveShopItem).toHaveBeenCalledWith({ id: 'item', name: 'Adena', item_id: 57, price: '5.00', quantity: 3, active: true })
  expect(await screen.findByRole('button', { name: 'Criar item' })).toBeVisible()
})

it('cria notícia como rascunho sem publicar implicitamente', async () => {
  const user = mount(<AdminNewsPage />)
  await user.type(screen.getByRole('textbox', { name: /Título/ }), 'Atualização')
  await user.type(screen.getByRole('textbox', { name: 'Conteúdo' }), 'Detalhes da atualização')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
  expect(staffApi.saveNews).toHaveBeenCalledWith({ id: undefined, title: 'Atualização', excerpt: '', body: 'Detalhes da atualização', is_published: false })
  expect(screen.getByRole('textbox', { name: /Título/ })).toHaveValue('')
})

it('notícia rejeitada mantém o conteúdo para correção', async () => {
  vi.mocked(staffApi.saveNews).mockRejectedValue(new ApiError('Título repetido', 400, 'INVALID'))
  const user = mount(<AdminNewsPage />)
  await user.type(screen.getByRole('textbox', { name: /Título/ }), 'Atualização')
  await user.type(screen.getByRole('textbox', { name: 'Conteúdo' }), 'Texto')
  await user.click(screen.getByRole('button', { name: 'Publicar notícia' }))
  expect(toast.error).toHaveBeenCalledWith('Título repetido')
  expect(screen.getByRole('textbox', { name: 'Conteúdo' })).toHaveValue('Texto')
})

it('servidor normaliza recursos e habilita restrição de login durante coming soon', async () => {
  const user = mount(<AdminServerPage />)
  await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveValue('PDL'))
  const restricted = screen.getByRole('checkbox', { name: /Permitir login apenas/ })
  expect(restricted).toBeDisabled()
  await user.click(screen.getByRole('checkbox', { name: /Ativar Coming Soon/ }))
  await user.click(restricted)
  await user.type(screen.getByRole('textbox', { name: /Recursos/ }), ' PvP \n\n Eventos ')
  await user.click(screen.getByRole('button', { name: /Salvar/ }))
  expect(staffApi.savePanel).toHaveBeenCalledWith(expect.objectContaining({ features: ['PvP', 'Eventos'], coming_soon: true, staff_only_login: true, max_level: 80 }))
})

it.each([false, true])('desvinculação exige confirmação, confirmada=%s', async confirm => {
  vi.spyOn(window, 'confirm').mockReturnValue(confirm)
  vi.mocked(staffApi.inspectAccount).mockResolvedValue({ login: 'hero', email: 'hero@test.dev', linked: true, linked_user_id: 'owner', panel_username: 'Owner' })
  vi.mocked(staffApi.unlinkAccount).mockResolvedValue({ login: 'hero', email: 'hero@test.dev', linked: false, linked_user_id: null, panel_username: null })
  const user = mount(<AdminAccountsPage />)
  await user.type(screen.getByLabelText('Login da conta L2'), ' hero ')
  await user.click(screen.getByRole('button', { name: 'Consultar' }))
  expect(staffApi.inspectAccount).toHaveBeenCalledWith('hero')
  await user.click(await screen.findByRole('button', { name: 'Remover vínculo' }))
  if (confirm) {
    expect(staffApi.unlinkAccount).toHaveBeenCalledWith('hero')
    expect(await screen.findByText('Nada a remover')).toBeVisible()
  } else expect(staffApi.unlinkAccount).not.toHaveBeenCalled()
})
