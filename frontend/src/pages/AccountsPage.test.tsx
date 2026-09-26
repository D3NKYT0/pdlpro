// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiError, lineageApi, serverApi, walletApi } from '../services/api'
import i18n from '../i18n'
import { AccountsPage } from './AccountsPage'

const session = vi.hoisted(() => ({ user: { id: 'u1', username: 'denky' } }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => session }))
vi.mock('../services/domain/lineage.service', () => ({
  lineageApi: {
    accounts: vi.fn(),
    characters: vi.fn(),
    register: vi.fn(),
    link: vi.fn(),
    requestLinkByEmail: vi.fn(),
    confirmLinkByEmail: vi.fn(),
    servicePrices: vi.fn(),
    purchaseSlots: vi.fn(),
    createCharacter: vi.fn(),
  },
  serviceAvailable: vi.fn(() => true),
}))
vi.mock('../services/domain/wallet.service', () => ({
  walletApi: {
    me: vi.fn(),
  },
}))
vi.mock('../services/domain/server.service', () => ({
  serverApi: {
    info: vi.fn(),
  },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

let client: QueryClient

beforeEach(() => {
  vi.resetAllMocks()
  session.user = { id: 'u1', username: 'denky' }
  vi.mocked(serverApi.info).mockResolvedValue({
    coming_soon: false,
    allow_registration: true,
    allow_l2_registration: true,
    staff_only_login: false,
  } as Awaited<ReturnType<typeof serverApi.info>>)
  vi.mocked(lineageApi.servicePrices).mockResolvedValue({
    CHANGE_NICKNAME: '10',
    CHANGE_SEX: '10',
    UNSTUCK: '0',
    LINK_SLOT: '10.00',
  } as any)
  vi.mocked(walletApi.me).mockResolvedValue({
    id: 'w1',
    balance: '50.00',
    bonus_balance: '0.00',
  } as any)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(async () => {
  cleanup()
  client.clear()
  await i18n.changeLanguage('pt')
})

function mount() {
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AccountsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

it('mostra vínculo pronto e vazio de personagens quando a conta existe no jogo', async () => {
  vi.mocked(lineageApi.accounts).mockResolvedValue({
    accounts: [{ login: 'denky', is_primary: true, linked: true }],
    slots: { used: 0, total: 3, can_link: true },
    primary: { login: 'denky', status: 'owned' },
  } as Awaited<ReturnType<typeof lineageApi.accounts>>)
  vi.mocked(lineageApi.characters).mockResolvedValue([])

  mount()

  expect(await screen.findByText('Conta pronta para jogar')).toBeVisible()
  expect(screen.getByText('Vinculada')).toBeVisible()
  expect(await screen.findByText('Nenhum personagem criado')).toBeVisible()
  expect(screen.queryByText('Conta Lineage não encontrada.')).not.toBeInTheDocument()
})

it('não mascara conta inexistente como lista vazia de personagens', async () => {
  vi.mocked(lineageApi.accounts).mockResolvedValue({
    accounts: [{ login: 'denky', is_primary: true, linked: true }],
    slots: { used: 0, total: 3, can_link: true },
    primary: { login: 'denky', status: 'owned' },
  } as Awaited<ReturnType<typeof lineageApi.accounts>>)
  vi.mocked(lineageApi.characters).mockRejectedValue(
    new ApiError('Conta Lineage não encontrada.', 404, 'GAME_ACCOUNT_NOT_FOUND'),
  )

  const user = mount()

  expect(await screen.findByText('Conta Lineage não encontrada.')).toBeVisible()
  expect(screen.getByText('Vínculo inconsistente')).toBeVisible()
  expect(screen.getByText('Inválida')).toBeVisible()
  expect(screen.queryByText('Conta pronta para jogar')).not.toBeInTheDocument()
  expect(screen.queryByText('Nenhum personagem criado')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(lineageApi.characters).toHaveBeenCalledTimes(2))
})

it('traduz o estado da conta e o formulário de criação no idioma ativo', async () => {
  vi.mocked(lineageApi.accounts).mockResolvedValue({
    accounts: [],
    slots: { used: 0, total: 3, can_link: true },
    primary: { login: 'denky', status: 'unclaimed' },
  } as Awaited<ReturnType<typeof lineageApi.accounts>>)
  await i18n.changeLanguage('en')

  mount()

  expect(screen.getByRole('heading', { name: 'Lineage account' })).toBeVisible()
  expect(await screen.findByRole('heading', { name: 'Claim primary account' })).toBeVisible()
  expect(screen.getByText('Awaiting creation')).toBeVisible()
  expect(screen.getByText('denky', { selector: 'strong' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Link an existing account' })).toBeVisible()
  expect(screen.getByText('No linked account')).toBeVisible()
})

it('mostra retrato Interlude na lista de personagens', async () => {
  vi.mocked(lineageApi.accounts).mockResolvedValue({
    accounts: [{ login: 'denky', is_primary: true, linked: true }],
    slots: { used: 1, total: 3, can_link: true },
    primary: { login: 'denky', status: 'owned' },
  } as Awaited<ReturnType<typeof lineageApi.accounts>>)
  vi.mocked(lineageApi.characters).mockResolvedValue([
    { char_id: 7, name: 'Hero', level: 80, class_id: 0, sex: 0, online: false },
  ] as Awaited<ReturnType<typeof lineageApi.characters>>)

  mount()

  expect(await screen.findByRole('img', { name: 'Retrato de Hero' })).toHaveAttribute('src', '/theme/avatars/human-m.png')
})

it('esconde criação de conta L2 quando o Coming Soon fecha o cadastro', async () => {
  vi.mocked(serverApi.info).mockResolvedValue({
    coming_soon: true,
    allow_registration: true,
    allow_l2_registration: false,
    staff_only_login: true,
  } as Awaited<ReturnType<typeof serverApi.info>>)
  vi.mocked(lineageApi.accounts).mockResolvedValue({
    accounts: [],
    slots: { used: 0, total: 3, can_link: true },
    primary: { login: 'denky', status: 'available' },
  } as Awaited<ReturnType<typeof lineageApi.accounts>>)

  mount()

  expect(await screen.findByText('Conta L2 ainda não liberada')).toBeVisible()
  expect(screen.getByText(/criação de contas do jogo ainda não foi liberada/i)).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Criar conta principal' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Vincular conta existente' })).toBeVisible()
})

it('abre modal de compra de slots ao clicar no botão de expandir e conclui compra', async () => {
  vi.mocked(lineageApi.accounts).mockResolvedValue({
    accounts: [{ login: 'denky', is_primary: true, linked: true }],
    slots: { used: 3, total: 3, can_link: false },
    primary: { login: 'denky', status: 'owned' },
  } as Awaited<ReturnType<typeof lineageApi.accounts>>)
  vi.mocked(lineageApi.characters).mockResolvedValue([])
  vi.mocked(lineageApi.purchaseSlots).mockResolvedValue({ extra_slots: 1, paid: '10.00' })

  const user = mount()

  expect(await screen.findByText('Limite de contas atingido')).toBeVisible()
  const buyBtns = screen.getAllByRole('button', { name: /Comprar slots adicionais/i })
  expect(buyBtns.length).toBeGreaterThan(0)

  await user.click(buyBtns[0])

  expect(screen.getByText('Comprar slots de conta')).toBeVisible()
  expect(screen.getByText('Saldo na carteira')).toBeVisible()

  await user.click(screen.getByRole('button', { name: /Comprar 1 slot\(s\) por 10\.00 moedas/i }))

  expect(lineageApi.purchaseSlots).toHaveBeenCalledWith(1)
})

it('abre modal de criação de personagem e chama lineageApi.createCharacter', async () => {
  vi.mocked(lineageApi.accounts).mockResolvedValue({
    accounts: [{ login: 'denky', is_primary: true, linked: true }],
    slots: { used: 1, total: 3, can_link: true },
    primary: { login: 'denky', status: 'owned' },
  } as Awaited<ReturnType<typeof lineageApi.accounts>>)
  vi.mocked(lineageApi.characters).mockResolvedValue([
    { char_id: 1, name: 'Sic', level: 35, class_id: 10, sex: 1, online: false },
  ] as Awaited<ReturnType<typeof lineageApi.characters>>)
  vi.mocked(lineageApi.createCharacter).mockResolvedValue({
    char_id: 2,
    name: 'Gimli',
    class_id: 53,
    level: 1,
  } as any)

  const user = mount()

  const createBtn = await screen.findByRole('button', { name: /^Criar personagem/i })
  expect(createBtn).toBeVisible()

  await user.click(createBtn)

  expect(screen.getByText('Criar Novo Personagem')).toBeVisible()
  const nameInput = screen.getByLabelText(/1\. Nick do Personagem/i)
  await user.type(nameInput, 'Gimli')

  await user.click(screen.getByRole('radio', { name: 'Anão' }))

  await user.click(screen.getByRole('button', { name: 'Criar Personagem' }))

  await waitFor(() => {
    expect(lineageApi.createCharacter).toHaveBeenCalledWith({
      login: 'denky',
      name: 'Gimli',
      race: 4,
      class_id: 53,
      sex: 0,
      hair_style: 0,
      hair_color: 0,
      face: 0,
    })
  })
})

