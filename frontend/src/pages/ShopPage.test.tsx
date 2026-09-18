// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ShopPage } from './ShopPage'
import { shopApi, walletApi } from '../services/api'
import { commerceApi } from '../services/api'

vi.mock('../components/ItemIcon', () => ({
  ItemIcon: ({ name, itemId }: { name?: string; itemId?: number }) => (
    <img alt={name || String(itemId)} data-testid="item-icon" />
  ),
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }))
vi.mock('../services/domain/shop.service', () => ({ shopApi: { catalog: vi.fn(), addToCart: vi.fn(), updateCartItem: vi.fn(), removeCartItem: vi.fn() } }))
vi.mock('../services/domain/wallet.service', () => ({ walletApi: { me: vi.fn() } }))
vi.mock('../services/domain/commerce.service', () => ({ commerceApi: { packages: vi.fn(), quote: vi.fn(), purchases: vi.fn(), options: vi.fn(), packageQuantity: vi.fn(), checkout: vi.fn() } }))
const quote = { items: [{ id: 'line', kind: 'item', name: 'Sword', quantity: 1, unit_price: '10', line_total: '10', grants: [] }], subtotal: '10', discount: '0', total: '10', bonus_used: '0', balance_due: '10', promo_code: '', use_bonus: false }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(shopApi.catalog).mockResolvedValue([{ id: 'item', item_id: 57, name: 'Adena', price: '10', quantity: 1 }] as any)
  vi.mocked(commerceApi.packages).mockResolvedValue([{ id: 'pack', name: 'Starter', total_price: '20', active: true, contents: [{ item: 'item', item_id: 57, name: 'Adena', quantity: 1, grant_quantity: 2 }] }])
  vi.mocked(commerceApi.quote).mockResolvedValue(structuredClone(quote))
  vi.mocked(commerceApi.purchases).mockResolvedValue([])
  vi.mocked(walletApi.me).mockResolvedValue({ balance: '100', bonus_balance: '5' } as any)
})
afterEach(cleanup)
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><ShopPage /></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it('destaca o ícone do item ao lado do texto, fora da arte', async () => {
  mount()
  const heading = await screen.findByRole('heading', { name: 'Adena' })
  const product = heading.closest('.shop-product')
  const body = product?.querySelector('.shop-product-body')
  expect(product?.querySelector('.shop-product-art img')).toBeNull()
  expect(product?.querySelector('.shop-product-icon img')).not.toBeNull()
  expect(body?.querySelector(':scope > .btn')).not.toBeNull()
  expect(product?.querySelector('.shop-product-info .btn')).toBeNull()
})
it('adiciona o produto pelo UUID e atualiza carrinho', async () => {
  const user = mount()
  expect(screen.getByRole('heading', { name: 'Loja do servidor' })).toBeTruthy()
  expect(document.querySelector('.inventory-tabs.shop-tabs')).not.toBeNull()
  expect(screen.getByRole('link', { name: /Abrir carteira/ }).getAttribute('href')).toBe('/panel/wallet')
  await user.click(await screen.findByRole('button', { name: 'Adicionar' }))
  expect(shopApi.addToCart).toHaveBeenCalledWith('item')
  await waitFor(() => expect(vi.mocked(commerceApi.quote).mock.calls.length).toBeGreaterThan(1))
})
it.each([['Diminuir Sword', 'remove'], ['Remover Sword', 'remove'], ['Aumentar Sword', 'update']])('controla quantidade: %s', async (label, action) => {
  const user = mount()
  await user.click(await screen.findByRole('button', { name: label }))
  if (action === 'remove') expect(shopApi.removeCartItem).toHaveBeenCalledWith('line')
  else expect(shopApi.updateCartItem).toHaveBeenCalledWith('line', 2)
})
it('seleciona pacote e preserva ID comercial', async () => {
  const user = mount()
  await user.click(screen.getByRole('tab', { name: 'Pacotes' }))
  await user.click(await screen.findByRole('button', { name: 'Adicionar pacote' }))
  expect(commerceApi.packageQuantity).toHaveBeenCalledWith('pack', 1)
})
it('usa ilustração esmaltada no pacote e no carrinho', async () => {
  const user = mount()
  await user.click(screen.getByRole('tab', { name: 'Pacotes' }))
  expect(await screen.findByText('Starter')).toBeTruthy()
  expect(document.querySelector('[data-enamel-icon="package"]')).not.toBeNull()
  expect(document.querySelector('[data-enamel-icon="cart"]')).not.toBeNull()
  expect(document.querySelector('[data-enamel-icon="package"]')?.classList.contains('enamel-glyph')).toBe(true)
})
it('aplica cupom e seleciona uso de bônus', async () => {
  const user = mount()
  await user.type(screen.getByLabelText('Cupom de desconto'), 'SAVE')
  await user.click(screen.getByRole('button', { name: 'Aplicar cupom' }))
  expect(commerceApi.options).toHaveBeenCalledWith({ promo_code: 'SAVE' })
  const checkbox = screen.getByRole('checkbox') as HTMLInputElement
  await waitFor(() => expect(checkbox.disabled).toBe(false))
  await user.click(checkbox)
  expect(commerceApi.options).toHaveBeenCalledWith({ use_bonus: true })
})
it('reutiliza chave após falha incerta e impede checkout simultâneo', async () => {
  let reject!: (error: Error) => void
  vi.mocked(commerceApi.checkout).mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail }))
  const user = mount()
  const button = await screen.findByRole('button', { name: 'Finalizar compra' }) as HTMLButtonElement
  await waitFor(() => expect(button.disabled).toBe(false))
  await user.click(button)
  await user.click(screen.getByRole('button', { name: 'Processando…' }))
  expect(commerceApi.checkout).toHaveBeenCalledTimes(1)
  const key = vi.mocked(commerceApi.checkout).mock.calls[0][0]
  expect(key).toMatch(/^[\da-f-]{36}$/)
  reject(new Error('Resposta perdida'))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Resposta perdida')
  await waitFor(() => expect(button.disabled).toBe(false))
  await user.click(button)
  expect(commerceApi.checkout).toHaveBeenLastCalledWith(key)
})
it.each(['empty', 'insufficient'])('impede checkout com carrinho %s', async reason => {
  vi.mocked(commerceApi.quote).mockResolvedValue({ ...quote, items: reason === 'empty' ? [] : quote.items, balance_due: '101' })
  mount()
  await screen.findByText('Adena')
  expect((screen.getByRole('button', { name: 'Finalizar compra' }) as HTMLButtonElement).disabled).toBe(true)
})
it('mostra histórico vazio e falha ao carregar catálogo', async () => {
  vi.mocked(shopApi.catalog).mockRejectedValue(new Error('Catálogo indisponível'))
  const user = mount()
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Catálogo indisponível')
  await user.click(screen.getByRole('tab', { name: 'Minhas compras' }))
  expect(await screen.findByText('Nenhuma compra ainda')).toBeTruthy()
  expect(screen.getByText(/Suas compras aparecerão aqui/)).toBeTruthy()
})
it('mostra o recibo da compra e abre o detalhe no clique', async () => {
  vi.mocked(commerceApi.purchases).mockResolvedValue([{
    id: 'buy-1',
    total: '10',
    subtotal: '12',
    discount: '0',
    bonus_used: '2',
    promo_code: 'SAVE',
    created_at: '2026-09-01T16:28:00.000Z',
    items: [{
      id: 'line',
      kind: 'item',
      name: 'Adena',
      quantity: 1,
      unit_price: '10',
      line_total: '10',
      grants: [{ item_id: 57, item_name: 'Adena', quantity: 1000 }],
    }],
  }])
  const user = mount()
  await user.click(screen.getByRole('tab', { name: 'Minhas compras' }))
  const receipt = await screen.findByRole('button', { name: /Ver detalhes da compra/ })
  expect(receipt.querySelector('.shop-history-seal img')).not.toBeNull()
  expect(receipt.textContent).toContain('1 × Adena')
  expect(receipt.textContent).toContain('Cupom SAVE')
  expect(receipt.textContent).toContain('Bônus')
  expect(receipt.textContent).not.toContain('Desconto')
  expect(receipt.textContent).toContain('Ver detalhes')
  await user.click(receipt)
  const dialog = await screen.findByRole('dialog', { name: 'Detalhe da compra' })
  expect(dialog.textContent).toContain('Subtotal')
  expect(dialog.textContent).toContain('1000 × Adena')
  expect(dialog.textContent).toContain('SAVE')
  expect(dialog.textContent).toContain('Entregue na bag')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: 'Detalhe da compra' })).toBeNull()
})
