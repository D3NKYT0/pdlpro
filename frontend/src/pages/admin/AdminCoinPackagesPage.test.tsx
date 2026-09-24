// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'

import { AdminCoinPackagesPage } from './AdminCoinPackagesPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const coinPackages = vi.fn()
const saveCoinPackage = vi.fn()
const deleteCoinPackage = vi.fn()

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api')
  return {
    ...actual,
    staffApi: {
      ...actual.staffApi,
      coinPackages: (...args: unknown[]) => coinPackages(...args),
      saveCoinPackage: (...args: unknown[]) => saveCoinPackage(...args),
      deleteCoinPackage: (...args: unknown[]) => deleteCoinPackage(...args),
    },
  }
})

const starter = {
  id: 'pack-1',
  code: 'starter',
  name: 'Iniciante',
  coins: '27.50',
  price_brl: '25.00',
  price_usd: '4.90',
  badge: '',
  active: true,
  sort_order: 1,
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminCoinPackagesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.clearAllMocks()
  coinPackages.mockResolvedValue([starter])
  saveCoinPackage.mockImplementation(async (payload: Record<string, unknown>) => ({
    id: String(payload.id || 'pack-2'),
    code: String(payload.code || ''),
    name: String(payload.name || ''),
    coins: String(payload.coins || ''),
    price_brl: String(payload.price_brl || ''),
    price_usd: String(payload.price_usd || ''),
    badge: String(payload.badge || ''),
    active: payload.active ?? true,
    sort_order: Number(payload.sort_order ?? 0),
  }))
  deleteCoinPackage.mockResolvedValue({ deleted: true })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('lista pacotes e cria um novo com BRL e USD', async () => {
  const user = mount()
  expect(await screen.findByText('Iniciante')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Pacotes de recarga' })).toBeVisible()

  const form = screen.getByRole('button', { name: 'Criar pacote' }).closest('form') as HTMLElement
  const fields = within(form)
  await user.type(fields.getByPlaceholderText('plus'), 'plus')
  const textInputs = fields.getAllByRole('textbox')
  await user.type(textInputs[1], 'Plus')
  const numbers = fields.getAllByRole('spinbutton')
  await user.clear(numbers[0])
  await user.type(numbers[0], '55')
  await user.clear(numbers[1])
  await user.type(numbers[1], '50')
  await user.clear(numbers[2])
  await user.type(numbers[2], '9.91')
  await user.click(fields.getByRole('button', { name: 'Criar pacote' }))

  await waitFor(() => expect(saveCoinPackage).toHaveBeenCalled())
  expect(saveCoinPackage).toHaveBeenCalledWith(
    expect.objectContaining({
      code: 'plus',
      name: 'Plus',
      coins: '55',
      price_brl: '50',
      price_usd: '9.91',
    }),
  )
  expect(toast.success).toHaveBeenCalled()
})

it('edita e remove um pacote existente', async () => {
  const user = mount()
  expect(await screen.findByText('Iniciante')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Editar' }))
  expect(screen.getByDisplayValue('starter')).toBeVisible()

  const form = screen.getByRole('button', { name: 'Atualizar pacote' }).closest('form') as HTMLElement
  const brl = within(form).getAllByRole('spinbutton')[1]
  await user.clear(brl)
  await user.type(brl, '30')
  await user.click(within(form).getByRole('button', { name: 'Atualizar pacote' }))
  await waitFor(() =>
    expect(saveCoinPackage).toHaveBeenCalledWith(expect.objectContaining({ id: 'pack-1', price_brl: '30' })),
  )

  await user.click(screen.getByRole('button', { name: 'Excluir' }))
  await waitFor(() => expect(deleteCoinPackage).toHaveBeenCalledWith('pack-1'))
})
