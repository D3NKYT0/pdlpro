// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AdminCommercePage } from './AdminCommercePage'
import { AdminItemObservationPage } from './AdminItemObservationPage'

const observationAccess = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'staff' } }) }))
vi.mock('../../components/ItemIcon', () => ({ ItemIcon: () => null }))
vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api')
  const pending = () => new Promise(() => {})
  return {
    ...actual,
    commerceApi: { ...actual.commerceApi, staffPackages: vi.fn(async () => []), staffPromos: vi.fn(async () => []) },
    shopApi: { ...actual.shopApi, catalog: vi.fn(async () => []) },
    programsApi: { ...actual.programsApi, staffSupporters: vi.fn(async () => []), resources: vi.fn(async () => []) },
    itemObservationApi: new Proxy({}, {
      get: (_target, key) => (key === 'access' ? observationAccess : pending),
    }),
  }
})

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function mount(page: ReactElement, path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        {page}
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  observationAccess.mockResolvedValue({
    capture: false,
    delete_snapshots: false,
    add_categories: false,
    change_categories: false,
    delete_categories: false,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('pacotes e cupons: grava a aba em ?tab= e reabre nela', async () => {
  const user = mount(<AdminCommercePage />, '/panel/admin/commerce')
  await user.click(screen.getByRole('button', { name: 'Cupons' }))
  expect(screen.getByTestId('location')).toHaveTextContent('?tab=promos')
  expect(screen.getByRole('button', { name: 'Cupons' })).toHaveClass('active')
  cleanup()

  mount(<AdminCommercePage />, '/panel/admin/commerce?tab=promos')
  expect(screen.getByRole('button', { name: 'Cupons' })).toHaveClass('active')
  expect(screen.getByRole('button', { name: 'Pacotes' })).not.toHaveClass('active')
})

it('observação de itens: grava a aba em ?tab= e reabre nela', async () => {
  const user = mount(<AdminItemObservationPage />, '/panel/admin/items')
  await user.click(await screen.findByRole('button', { name: 'Categorias' }))
  expect(screen.getByTestId('location')).toHaveTextContent('?tab=categories')
  expect(screen.getByRole('button', { name: 'Categorias' })).toHaveAttribute('aria-pressed', 'true')
  cleanup()

  mount(<AdminItemObservationPage />, '/panel/admin/items?tab=snapshots')
  expect(await screen.findByRole('button', { name: 'Snapshots e comparação' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Ao vivo' })).toHaveAttribute('aria-pressed', 'false')
})
