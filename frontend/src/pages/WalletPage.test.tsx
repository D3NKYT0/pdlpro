// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { WalletPage } from './WalletPage'
import { ApiError, paymentApi, walletApi } from '../services/api'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'hero@test.dev' } }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../services/domain/payment.service', () => ({ paymentApi: { list: vi.fn(), catalog: vi.fn(), create: vi.fn(), confirm: vi.fn() } }))
vi.mock('../services/domain/wallet.service', () => ({ walletApi: { me: vi.fn(), transactions: vi.fn(), transfer: vi.fn() } }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(walletApi.me).mockResolvedValue({ balance: '50.00', bonus_balance: '5.00' } as any)
  vi.mocked(walletApi.transactions).mockResolvedValue({ results: [] })
  vi.mocked(paymentApi.list).mockResolvedValue([])
  vi.mocked(paymentApi.catalog).mockResolvedValue({ methods: [], packages: [] } as any)
})
afterEach(cleanup)
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><WalletPage /></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it.each([['SAIDA', '−12.34 moedas'], ['ENTRADA', '+12.34 moedas'], ['debit', '−12.34 moedas']])('mostra sinal correto para movimento %s', async (kind, expected) => {
  vi.mocked(walletApi.transactions).mockResolvedValue({ results: [{ id: 'tx', kind, amount: '12.34', description: 'Movimento' }] } as any)
  mount()
  expect(await screen.findByText(expected)).toBeTruthy()
})

it('envia quantidade decimal e atualiza saldo e extrato após transferência', async () => {
  vi.mocked(walletApi.transfer).mockResolvedValue({ balance: '37.66' } as any)
  const user = mount()
  await user.type(screen.getByLabelText('Destinatário'), 'friend')
  await user.type(screen.getByLabelText('Quantidade'), '12.34')
  await user.click(screen.getByRole('button', { name: 'Transferir moedas' }))
  expect(walletApi.transfer).toHaveBeenCalledWith('friend', '12.34')
  await waitFor(() => expect((screen.getByLabelText('Destinatário') as HTMLInputElement).value).toBe(''))
  expect(toast.success).toHaveBeenCalledWith('Transferência enviada')
  expect(vi.mocked(walletApi.me).mock.calls.length).toBeGreaterThan(1)
  expect(vi.mocked(walletApi.transactions).mock.calls.length).toBeGreaterThan(1)
})

it('mantém formulário preenchido quando o servidor rejeita a transferência', async () => {
  vi.mocked(walletApi.transfer).mockRejectedValue(new ApiError('Saldo insuficiente', 400, 'INSUFFICIENT_BALANCE'))
  const user = mount()
  await user.type(screen.getByLabelText('Destinatário'), 'friend')
  await user.type(screen.getByLabelText('Quantidade'), '99')
  await user.click(screen.getByRole('button', { name: 'Transferir moedas' }))
  expect(toast.error).toHaveBeenCalledWith('Saldo insuficiente')
  expect((screen.getByLabelText('Destinatário') as HTMLInputElement).value).toBe('friend')
  expect((screen.getByRole('button', { name: 'Transferir moedas' }) as HTMLButtonElement).disabled).toBe(false)
})

it('desabilita novo envio enquanto transferência está pendente', async () => {
  let finish!: (value: any) => void
  vi.mocked(walletApi.transfer).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const user = mount()
  await user.type(screen.getByLabelText('Destinatário'), 'friend')
  await user.type(screen.getByLabelText('Quantidade'), '1')
  await user.click(screen.getByRole('button', { name: 'Transferir moedas' }))
  const button = screen.getByRole('button', { name: 'Enviando...' }) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  await user.click(button)
  expect(walletApi.transfer).toHaveBeenCalledTimes(1)
  finish({ balance: '49.00' })
  await screen.findByRole('button', { name: 'Transferir moedas' })
})

it('informa indisponibilidade de recarga sem criar pedido', async () => {
  mount()
  expect(await screen.findByText('Recargas temporariamente indisponíveis')).toBeTruthy()
  expect(paymentApi.create).not.toHaveBeenCalled()
})
