// @vitest-environment jsdom
import type { ReactElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WalletOrdersPage } from './WalletOrdersPage'
import { WalletTransactionsPage } from './WalletTransactionsPage'
import { paymentApi, walletApi } from '../services/api'

vi.mock('../services/domain/payment.service', () => ({
  paymentApi: { list: vi.fn() },
}))
vi.mock('../services/domain/wallet.service', () => ({
  walletApi: { transactions: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(paymentApi.list).mockResolvedValue({ count: 0, total_pages: 1, next: null, previous: null, results: [] })
  vi.mocked(walletApi.transactions).mockResolvedValue({ count: 0, total_pages: 1, next: null, previous: null, results: [] })
})
afterEach(cleanup)

function mount(page: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter>{page}</MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it('pedidos pagina, abre modal e volta à carteira', async () => {
  vi.mocked(paymentApi.list).mockResolvedValue({
    count: 21,
    total_pages: 2,
    next: 'next',
    previous: null,
    results: [{
      id: 'ord-1',
      amount: '25.00',
      coins: '25.00',
      currency: 'BRL',
      package_code: '',
      method: 'mock',
      status: 'pending',
      checkout_url: '',
      bonus_applied: '0.00',
      total_credited: '0.00',
      created_at: '2026-09-08T12:00:00Z',
      paid_at: null,
    }],
  })
  const user = mount(<WalletOrdersPage />)
  expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeTruthy()
  expect(screen.getByRole('link', { name: /Voltar à carteira/ }).getAttribute('href')).toBe('/painel/wallet')
  await user.click(await screen.findByRole('button', { name: /25.00 moedas/ }))
  expect(await screen.findByRole('dialog', { name: 'Detalhe do pedido' })).toBeTruthy()
  expect(screen.getByText('ord-1')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /Próxima/ }))
  await waitFor(() => expect(paymentApi.list).toHaveBeenCalledWith({ page: 2, page_size: 20 }))
})

it('extrato pagina e abre modal de movimentação', async () => {
  vi.mocked(walletApi.transactions).mockResolvedValue({
    count: 21,
    total_pages: 2,
    next: 'next',
    previous: null,
    results: [{
      id: 'tx-1',
      kind: 'ENTRADA',
      amount: '10.00',
      description: 'Bônus diário',
      origin: 'daily',
      destination: '',
      created_at: '2026-09-08T12:00:00Z',
    }],
  })
  const user = mount(<WalletTransactionsPage />)
  expect(await screen.findByRole('heading', { level: 1, name: 'Extrato' })).toBeTruthy()
  await user.click(await screen.findByRole('button', { name: /Bônus diário/ }))
  expect(await screen.findByRole('dialog', { name: 'Detalhe da movimentação' })).toBeTruthy()
  expect(screen.getByText('tx-1')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /Próxima/ }))
  await waitFor(() => expect(walletApi.transactions).toHaveBeenCalledWith({ page: 2, page_size: 20 }))
})
