// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'

import { AdminWalletPage } from './AdminWalletPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const walletPromo = vi.fn()
const saveWalletPromo = vi.fn()
const bonusTiers = vi.fn()
const saveBonusTier = vi.fn()
const deleteBonusTier = vi.fn()
const previewBonusSimulation = vi.fn()

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api')
  return {
    ...actual,
    staffApi: {
      ...actual.staffApi,
      walletPromo: (...args: unknown[]) => walletPromo(...args),
      saveWalletPromo: (...args: unknown[]) => saveWalletPromo(...args),
      bonusTiers: (...args: unknown[]) => bonusTiers(...args),
      saveBonusTier: (...args: unknown[]) => saveBonusTier(...args),
      deleteBonusTier: (...args: unknown[]) => deleteBonusTier(...args),
      previewBonusSimulation: (...args: unknown[]) => previewBonusSimulation(...args),
    },
  }
})

const samplePromo = {
  id: 'promo-1',
  percent: '15.00',
  title: 'Campanha de Primavera',
  description: '15% de bônus em todas as recargas',
  badge: 'ESPECIAL',
  stacking_mode: 'max' as const,
  first_purchase_active: true,
  first_purchase_percent: '20.00',
  pix_bonus_percent: '5.00',
  active: true,
  starts_at: null,
  ends_at: null,
  currently_active: true,
}

const sampleTier = {
  id: 'tier-1',
  min_amount: 100,
  max_amount: 500,
  percent: '10.00',
  description: 'Faixa Bronze (+10%)',
  active: true,
  order: 1,
}

const sampleSimResult = {
  amount: 200,
  payment_method: 'standard',
  is_first_purchase: false,
  total_percent: '15.00',
  bonus_coins: 30,
  total_coins: 230,
  rule_applied: 'Campanha de Primavera',
  breakdown: {
    tier_bonus: 20,
    promo_bonus: 30,
    pix_bonus: 0,
    first_purchase_bonus: 0,
  },
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminWalletPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.clearAllMocks()
  walletPromo.mockResolvedValue(samplePromo)
  bonusTiers.mockResolvedValue([sampleTier])
  saveWalletPromo.mockResolvedValue({ ...samplePromo })
  saveBonusTier.mockImplementation(async (payload) => ({ id: 'tier-2', ...payload }))
  deleteBonusTier.mockResolvedValue({ deleted: true })
  previewBonusSimulation.mockResolvedValue(sampleSimResult)
})

afterEach(() => {
  cleanup()
})

it('renderiza abas e permite navegar entre Campanhas, Faixas, Regras e Simulador', async () => {
  const user = mount()

  // Aba inicial é Campanhas & Eventos
  expect(await screen.findByRole('heading', { name: /Banner na carteira/ })).toBeInTheDocument()

  // Alterna para Faixas Progressivas
  await user.click(screen.getByRole('tab', { name: /Faixas Progressivas/ }))
  expect(await screen.findByText('Faixas de Moedas')).toBeInTheDocument()
  expect(screen.getByText('Faixa Bronze (+10%)')).toBeInTheDocument()

  // Alterna para Regras Especiais
  await user.click(screen.getByRole('tab', { name: /Regras Especiais/ }))
  expect(await screen.findByText('Incentivos de Conversão')).toBeInTheDocument()
  expect(screen.getByText('Bônus de Primeira Recarga')).toBeInTheDocument()

  // Alterna para Simulador
  await user.click(screen.getByRole('tab', { name: /Simulador/ }))
  expect(await screen.findByText('Simular Regras de Bônus')).toBeInTheDocument()
  expect(screen.getByText('Quantidade de moedas a recarregar')).toBeInTheDocument()
})

it('salva promoção com badge, modo cumulativo e porcentagem', async () => {
  const user = mount()

  const percentInput = await screen.findByRole('spinbutton', { name: /Percentual de bônus/ })
  await waitFor(() => expect(percentInput).toHaveValue(15))

  await user.clear(percentInput)
  await user.type(percentInput, '25')

  const titleInput = screen.getByLabelText('Título')
  await user.clear(titleInput)
  await user.type(titleInput, 'Super Campanha 25%')

  // Seleciona modo Cumulativo
  await user.click(screen.getByRole('radio', { name: /Cumulativo/ }))

  await user.click(screen.getByRole('button', { name: /Salvar/ }))

  expect(saveWalletPromo).toHaveBeenCalledWith(
    expect.objectContaining({
      percent: '25',
      title: 'Super Campanha 25%',
      stacking_mode: 'sum',
      active: true,
    }),
  )
  expect(toast.success).toHaveBeenCalledWith('Promoção da carteira atualizada')
})

it('permite cadastrar nova faixa progressiva através do modal', async () => {
  const user = mount()

  await user.click(screen.getByRole('tab', { name: /Faixas Progressivas/ }))
  await screen.findByText('Faixa Bronze (+10%)')

  // Abre modal de nova faixa
  await user.click(screen.getByRole('button', { name: /Nova Faixa/ }))
  expect(screen.getByRole('heading', { name: 'Nova Faixa Progressiva' })).toBeInTheDocument()

  // Preenche dados da faixa
  const descInput = screen.getByPlaceholderText(/Ex: Faixa Ouro/)
  await user.type(descInput, 'Faixa Ouro (+20%)')

  const minInput = screen.getByRole('spinbutton', { name: /Qtd. Mínima de Moedas/ })
  await user.clear(minInput)
  await user.type(minInput, '1000')

  const percentInput = screen.getByRole('spinbutton', { name: /Bônus \(%\)/ })
  await user.clear(percentInput)
  await user.type(percentInput, '20')

  await user.click(screen.getByRole('button', { name: 'Salvar Faixa' }))

  expect(saveBonusTier).toHaveBeenCalledWith(
    expect.objectContaining({
      description: 'Faixa Ouro (+20%)',
      min_amount: 1000,
      percent: '20',
      active: true,
    }),
  )
  expect(toast.success).toHaveBeenCalledWith('Faixa de bônus salva')
})

it('permite excluir faixa progressiva após confirmação', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const user = mount()

  await user.click(screen.getByRole('tab', { name: /Faixas Progressivas/ }))
  await screen.findByText('Faixa Bronze (+10%)')

  const deleteBtn = screen.getByRole('button', { name: 'Excluir' })
  await user.click(deleteBtn)

  expect(window.confirm).toHaveBeenCalled()
  expect(deleteBonusTier).toHaveBeenCalledWith('tier-1')
  expect(toast.success).toHaveBeenCalledWith('Faixa removida com sucesso')
})

it('simulador interativo calcula e apresenta métricas de bônus', async () => {
  const user = mount()

  await user.click(screen.getByRole('tab', { name: /Simulador/ }))
  expect(await screen.findByText('Simular Regras de Bônus')).toBeInTheDocument()

  // Verifica resultado da simulação renderizado
  expect(await screen.findByText('+15%')).toBeInTheDocument()
  expect(screen.getByText('230')).toBeInTheDocument()
  expect(screen.getByText('+30')).toBeInTheDocument()
  expect(screen.getByText('+20 moedas')).toBeInTheDocument()

  // Clica num chip de moeda rápida (ex: 1000 moedas)
  previewBonusSimulation.mockResolvedValueOnce({
    amount: 1000,
    payment_method: 'standard',
    is_first_purchase: false,
    total_percent: '20.00',
    bonus_coins: 200,
    total_coins: 1200,
    rule_applied: 'Faixa Ouro',
    breakdown: {
      tier_bonus: 200,
      promo_bonus: 0,
      pix_bonus: 0,
      first_purchase_bonus: 0,
    },
  })

  await user.click(screen.getByRole('button', { name: '1000 moedas' }))

  await waitFor(() => {
    expect(previewBonusSimulation).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000 }),
    )
  })
  expect(await screen.findByText('+20%')).toBeInTheDocument()
  expect(screen.getByText('1200')).toBeInTheDocument()
})

it('simulador não quebra a tela se a resposta vier sem objeto breakdown aninhado', async () => {
  previewBonusSimulation.mockResolvedValue({
    amount: 500,
    bonus: 50,
    percent: '10.00',
    total: 550,
    description: 'Faixa 10%',
    tier_bonus: 50,
    promo_bonus: 0,
    pix_bonus: 0,
    first_purchase_bonus: 0,
  } as any)

  const user = mount()
  await user.click(screen.getByRole('tab', { name: /Simulador/ }))

  expect(await screen.findByText('Simular Regras de Bônus')).toBeInTheDocument()
  expect(await screen.findByText('+10%')).toBeInTheDocument()
  expect(screen.getByText('550')).toBeInTheDocument()
  expect(screen.getByText('+50')).toBeInTheDocument()
})

