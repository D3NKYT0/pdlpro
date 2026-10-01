// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'

import { AdminChargeCurrenciesPage } from './AdminChargeCurrenciesPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const chargeCurrencies = vi.fn()
const saveChargeCurrency = vi.fn()
const deleteChargeCurrency = vi.fn()

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api')
  return {
    ...actual,
    staffApi: {
      ...actual.staffApi,
      chargeCurrencies: (...args: unknown[]) => chargeCurrencies(...args),
      saveChargeCurrency: (...args: unknown[]) => saveChargeCurrency(...args),
      deleteChargeCurrency: (...args: unknown[]) => deleteChargeCurrency(...args),
    },
  }
})

const initialCurrencies = [
  {
    id: 'cur-brl',
    code: 'BRL',
    name: 'Real Brasileiro',
    symbol: 'R$',
    coins_per_unit: '1.00',
    is_settlement: true,
    enabled: true,
    sort_order: 0,
  },
  {
    id: 'cur-usd',
    code: 'USD',
    name: 'Dólar Americano',
    symbol: '$',
    coins_per_unit: '5.00',
    is_settlement: false,
    enabled: true,
    sort_order: 1,
  },
]

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminChargeCurrenciesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe('AdminChargeCurrenciesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chargeCurrencies.mockResolvedValue(initialCurrencies)
    saveChargeCurrency.mockResolvedValue({ id: 'cur-new', code: 'EUR' })
    deleteChargeCurrency.mockResolvedValue({ deleted: true })
    window.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders currencies list, settlement badge, and stats correctly', async () => {
    mount()

    const brlElements = await screen.findAllByText('Real Brasileiro')
    expect(brlElements.length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dólar Americano').length).toBeGreaterThan(0)

    // BRL is settlement
    expect(screen.getAllByText(/Moeda de Liquidação/i).length).toBeGreaterThan(0)

    // Rates displayed
    expect(screen.getByText('1 BRL = 1.00 Coins')).toBeInTheDocument()
    expect(screen.getByText('1 USD = 5.00 Coins')).toBeInTheDocument()

    // Simulator displays active currencies
    expect(screen.getByText(/Simulador de Cotação/i)).toBeInTheDocument()
  })

  it('allows creating a new currency through the form', async () => {
    const user = mount()

    await screen.findAllByText('Real Brasileiro')

    const codeInput = screen.getByPlaceholderText(/ex: EUR, ARS/i)
    const nameInput = screen.getByPlaceholderText(/ex: Euro, Peso/i)
    const symbolInput = screen.getByPlaceholderText(/ex: €, \$/i)
    const coinsInput = screen.getByDisplayValue('1.00')

    await user.type(codeInput, 'EUR')
    await user.type(nameInput, 'Euro Europeu')
    await user.type(symbolInput, '€')
    await user.clear(coinsInput)
    await user.type(coinsInput, '5.50')

    const saveButton = screen.getByRole('button', { name: /Salvar/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(saveChargeCurrency).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'EUR',
          name: 'Euro Europeu',
          symbol: '€',
          coins_per_unit: expect.stringMatching(/^5\.5/),
          enabled: true,
        }),
      )
    })
    expect(toast.success).toHaveBeenCalled()
  })

  it('allows editing an existing currency', async () => {
    const user = mount()

    await screen.findAllByText('Dólar Americano')

    const editUsdBtn = screen.getByRole('button', { name: /Editar USD/i })
    await user.click(editUsdBtn)

    // Form now in edit mode
    expect(screen.getByRole('heading', { level: 2, name: /Editar moeda USD/i })).toBeInTheDocument()

    // Change rate
    const coinsInput = screen.getByDisplayValue('5.00')
    await user.clear(coinsInput)
    await user.type(coinsInput, '6.00')

    const saveBtn = screen.getByRole('button', { name: /Salvar/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(saveChargeCurrency).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cur-usd',
          coins_per_unit: expect.stringMatching(/^6/),
        }),
      )
    })
  })

  it('prevents deleting the settlement currency', async () => {
    mount()

    await screen.findAllByText('Real Brasileiro')

    // BRL is settlement, so no delete button for BRL
    expect(screen.queryByRole('button', { name: /Excluir BRL/i })).not.toBeInTheDocument()

    // USD has delete button
    expect(screen.getByRole('button', { name: /Excluir USD/i })).toBeInTheDocument()
  })

  it('allows deleting a non-settlement currency', async () => {
    const user = mount()

    await screen.findAllByText('Dólar Americano')

    const deleteUsdBtn = screen.getByRole('button', { name: /Excluir USD/i })
    await user.click(deleteUsdBtn)

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(deleteChargeCurrency).toHaveBeenCalledWith('cur-usd')
    })
    expect(toast.success).toHaveBeenCalled()
  })
})
