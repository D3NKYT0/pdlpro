// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  vi.mocked(walletApi.transactions).mockResolvedValue({ count: 0, total_pages: 1, next: null, previous: null, results: [] })
  vi.mocked(paymentApi.list).mockResolvedValue({ count: 0, total_pages: 1, next: null, previous: null, results: [] })
  vi.mocked(paymentApi.catalog).mockResolvedValue({ methods: [], packages: [], promo: null } as any)
})
afterEach(cleanup)
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><WalletPage /></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it('abre modal de pedido e aponta para histórico completo', async () => {
  vi.mocked(paymentApi.list).mockResolvedValue({
    count: 1,
    total_pages: 1,
    next: null,
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
  const user = mount()
  expect((await screen.findByRole('link', { name: 'Ver todos os pedidos' })).getAttribute('href')).toBe('/panel/wallet/orders')
  expect(screen.getByRole('link', { name: 'Ver todo o extrato' }).getAttribute('href')).toBe('/panel/wallet/statement')
  await user.click(await screen.findByRole('button', { name: /25.00 moedas/ }))
  expect(await screen.findByRole('dialog', { name: 'Detalhe do pedido' })).toBeTruthy()
  expect(screen.getByText('ord-1')).toBeTruthy()
})

it('coloca o atalho de troca com o jogo ao lado do saldo', async () => {
  mount()
  const link = await screen.findByRole('link', { name: 'Transferir moedas entre carteira e jogo' })
  expect(link.getAttribute('href')).toBe('/panel/wallet/game')
  expect(link.classList.contains('wallet-game-exchange')).toBe(true)
  expect(link.closest('.wallet-balance-card')).toBeTruthy()
  expect(link.closest('.wallet-balance-card')?.querySelector('.wallet-balance-copy')).toBeTruthy()
})

it('mostra banner promocional e move a arte com o mouse', async () => {
  vi.mocked(paymentApi.catalog).mockResolvedValue({
    methods: [],
    packages: [],
    allow_custom_amount: true,
    promo: { percent: '20.00', title: 'Recarga em promoção', description: '20% a mais de moedas' },
  } as any)
  mount()
  const banner = await screen.findByLabelText('Recarga em promoção')
  expect(screen.getByText('20%')).toBeTruthy()
  expect(screen.getByText('OFF')).toBeTruthy()
  expect(screen.getByText('20% a mais de moedas')).toBeTruthy()
  vi.spyOn(banner, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, bottom: 200, right: 400, width: 400, height: 200, toJSON: () => ({}),
  })
  fireEvent.mouseMove(banner, { clientX: 300, clientY: 50 })
  await waitFor(() => {
    expect(Number(banner.style.getPropertyValue('--promo-mx'))).toBeGreaterThan(0)
  })
  fireEvent.mouseLeave(banner)
  await waitFor(() => {
    expect(banner.style.getPropertyValue('--promo-mx')).toBe('0.000')
  })
})

it('omite banner promocional quando o catálogo não traz promo', async () => {
  mount()
  await screen.findByText('Prefere outro valor?')
  expect(screen.queryByText('OFF')).toBeNull()
  expect(screen.queryByLabelText('Recarga em promoção')).toBeNull()
})

it.each([['SAIDA', '−12.34 moedas'], ['ENTRADA', '+12.34 moedas'], ['debit', '−12.34 moedas']])('mostra sinal correto para movimento %s', async (kind, expected) => {
  vi.mocked(walletApi.transactions).mockResolvedValue({
    count: 1,
    total_pages: 1,
    next: null,
    previous: null,
    results: [{ id: 'tx', kind, amount: '12.34', description: 'Movimento', origin: '', destination: '', created_at: '2026-09-08T12:00:00Z' }],
  })
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

it('cria pedido mock sem confirmar saldo automaticamente mesmo com auto_confirm', async () => {
  vi.mocked(paymentApi.catalog).mockResolvedValue({
    currency: 'BRL',
    methods: [{ id: 'mock', public_key: '', currencies: ['BRL'], auto_confirm: true }],
    packages: [],
    allow_custom_amount: true,
    promo: null,
  })
  vi.mocked(paymentApi.create).mockResolvedValue({
    id: 'ord-mock',
    amount: '10.00',
    coins: '10.00',
    currency: 'BRL',
    package_code: '',
    method: 'mock',
    status: 'pending',
    checkout_url: '',
    bonus_applied: '0.00',
    total_credited: '0.00',
    created_at: '2026-09-12T12:00:00Z',
    paid_at: null,
  })
  const user = mount()
  await user.type(await screen.findByLabelText('Valor em BRL'), '10')
  await user.click(screen.getByRole('button', { name: 'Comprar agora' }))
  await waitFor(() => expect(paymentApi.create).toHaveBeenCalled())
  expect(paymentApi.confirm).not.toHaveBeenCalled()
  expect(toast.success).toHaveBeenCalledWith('Pedido simulado criado. A equipe precisa confirmar no admin para o saldo entrar.')
})

it('informa indisponibilidade de recarga sem criar pedido', async () => {
  mount()
  expect(await screen.findByText('Recargas temporariamente indisponíveis')).toBeTruthy()
  expect(paymentApi.create).not.toHaveBeenCalled()
})

it('oculta USD quando apenas Mercado Pago estiver ativo', async () => {
  vi.mocked(paymentApi.catalog).mockResolvedValue({
    currency: 'BRL',
    methods: [{ id: 'mercadopago', public_key: 'mp-key', currencies: ['BRL'] }],
    packages: [],
    allow_custom_amount: true,
    promo: null,
  })
  mount()
  await screen.findByText('Escolha sua recarga')
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: /USD/ })).toBeNull()
  })
  expect(screen.getByText('BRL')).toBeTruthy()
})

it('permite recarga em BRL via Stripe quando Mercado Pago estiver inativo', async () => {
  vi.mocked(paymentApi.catalog).mockResolvedValue({
    currency: 'BRL',
    methods: [{ id: 'stripe', public_key: 'pk-test', currencies: ['USD', 'BRL'] }],
    packages: [],
    allow_custom_amount: true,
    promo: null,
  })
  vi.mocked(paymentApi.create).mockResolvedValue({
    id: 'ord-stripe-brl',
    amount: '50.00',
    coins: '50.00',
    currency: 'BRL',
    package_code: '',
    method: 'stripe',
    status: 'pending',
    client_secret: 'sec-brl',
    checkout_url: '',
    bonus_applied: '0.00',
    total_credited: '0.00',
    created_at: '2026-09-12T12:00:00Z',
    paid_at: null,
  })
  const user = mount()
  expect(await screen.findByRole('button', { name: /BRL/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /USD/ })).toBeTruthy()
  expect(await screen.findByText('Pagamento com cartão via Stripe')).toBeTruthy()

  await user.type(screen.getByLabelText('Valor em BRL'), '50')
  await user.click(screen.getByRole('button', { name: 'Comprar agora' }))
  await waitFor(() => {
    expect(paymentApi.create).toHaveBeenCalledWith({
      package_id: undefined,
      amount: '50',
      currency: 'BRL',
      method: 'stripe',
    })
  })
})

it('oculta o seletor e cobra no Stripe quando o admin fixa o cartão em BRL', async () => {
  vi.mocked(paymentApi.catalog).mockResolvedValue({
    currency: 'BRL',
    brl_method_priority: 'stripe',
    methods: [
      { id: 'mercadopago', public_key: 'mp-key', currencies: ['BRL'] },
      { id: 'stripe', public_key: 'pk-test', currencies: ['USD', 'BRL'] },
    ],
    packages: [],
    allow_custom_amount: true,
    promo: null,
  })
  vi.mocked(paymentApi.create).mockResolvedValue({
    id: 'ord-fixed-stripe',
    amount: '20.00',
    coins: '20.00',
    currency: 'BRL',
    package_code: '',
    method: 'stripe',
    status: 'pending',
    client_secret: 'sec-fixed',
    checkout_url: '',
    bonus_applied: '0.00',
    total_credited: '0.00',
    created_at: '2026-09-12T12:00:00Z',
    paid_at: null,
  })
  const user = mount()
  expect(await screen.findByText('Pagamento com cartão via Stripe')).toBeTruthy()
  expect(screen.queryByRole('radio', { name: 'Mercado Pago' })).toBeNull()
  expect(screen.queryByRole('radio', { name: 'Stripe (Cartão)' })).toBeNull()
  await user.type(screen.getByLabelText('Valor em BRL'), '20')
  await user.click(screen.getByRole('button', { name: 'Comprar agora' }))
  await waitFor(() => {
    expect(paymentApi.create).toHaveBeenCalledWith({
      package_id: undefined,
      amount: '20',
      currency: 'BRL',
      method: 'stripe',
    })
  })
})

it('oculta o seletor e cobra no Mercado Pago quando o admin fixa esse método', async () => {
  vi.mocked(paymentApi.catalog).mockResolvedValue({
    currency: 'BRL',
    brl_method_priority: 'mercadopago',
    methods: [
      { id: 'mercadopago', public_key: 'mp-key', currencies: ['BRL'] },
      { id: 'stripe', public_key: 'pk-test', currencies: ['USD', 'BRL'] },
    ],
    packages: [],
    allow_custom_amount: true,
    promo: null,
  })
  const user = mount()
  expect(await screen.findByText('Pagamento nacional via Mercado Pago')).toBeTruthy()
  expect(screen.queryByRole('radio', { name: 'Mercado Pago' })).toBeNull()
  await user.type(screen.getByLabelText('Valor em BRL'), '15')
  await user.click(screen.getByRole('button', { name: 'Comprar agora' }))
  await waitFor(() => {
    expect(paymentApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'BRL', method: 'mercadopago', amount: '15' }),
    )
  })
})

it('permite alternar entre Mercado Pago e Stripe quando ambos suportam BRL', async () => {
  vi.mocked(paymentApi.catalog).mockResolvedValue({
    currency: 'BRL',
    methods: [
      { id: 'mercadopago', public_key: 'mp-key', currencies: ['BRL'] },
      { id: 'stripe', public_key: 'pk-test', currencies: ['USD', 'BRL'] },
    ],
    packages: [],
    allow_custom_amount: true,
    promo: null,
  })
  const user = mount()
  expect(await screen.findByRole('radio', { name: 'Mercado Pago' })).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'Stripe (Cartão)' })).toBeTruthy()
  expect(screen.getByText('Pagamento nacional via Mercado Pago')).toBeTruthy()

  await user.click(screen.getByRole('radio', { name: 'Stripe (Cartão)' }))
  expect(await screen.findByText('Pagamento com cartão via Stripe')).toBeTruthy()
})

it('renderiza seletor de moedas dinâmico e filtra pacotes conforme moeda', async () => {
  vi.mocked(paymentApi.catalog).mockResolvedValue({
    currency: 'BRL',
    currencies: [
      { code: 'BRL', symbol: 'R$', name: 'Real', coins_per_unit: '1.00', is_settlement: true },
      { code: 'USD', symbol: '$', name: 'Dólar', coins_per_unit: '0.20', is_settlement: false },
      { code: 'EUR', symbol: '€', name: 'Euro', coins_per_unit: '0.18', is_settlement: false },
    ],
    methods: [
      { id: 'stripe', public_key: 'pk-test', currencies: ['BRL', 'USD', 'EUR'] },
    ],
    packages: [
      {
        id: 'pkg-1',
        code: 'pack-all',
        name: 'Pacote Global',
        coins: '100',
        price_brl: '50.00',
        price_usd: '10.00',
        prices: { BRL: '50.00', USD: '10.00', EUR: '9.00' },
        badge: '',
        bonus: '0',
        total_coins: '100',
      },
      {
        id: 'pkg-2',
        code: 'pack-brl-only',
        name: 'Pacote Brasil',
        coins: '50',
        price_brl: '25.00',
        price_usd: '',
        prices: { BRL: '25.00' },
        badge: '',
        bonus: '0',
        total_coins: '50',
      },
    ],
    allow_custom_amount: true,
    promo: null,
  })
  const user = mount()

  expect(await screen.findByText('Pacote Global')).toBeTruthy()
  expect(screen.getByText('Pacote Brasil')).toBeTruthy()
  expect(screen.getByRole('button', { name: /EUR/ })).toBeTruthy()

  await user.click(screen.getByRole('button', { name: /EUR/ }))
  expect(await screen.findByText('Pacote Global')).toBeTruthy()
  expect(screen.queryByText('Pacote Brasil')).toBeNull()
})
