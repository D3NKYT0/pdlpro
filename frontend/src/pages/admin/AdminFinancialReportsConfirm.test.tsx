// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { AdminFinancialReportsPage } from './AdminFinancialReportsPage'
import { financialReportsApi, staffApi, type FinancialReport } from '../../services/api'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../services/domain/financial-reports.service', () => ({ financialReportsApi: { get: vi.fn() } }))
vi.mock('../../services/domain/staff.service', () => ({ staffApi: { confirmMockPayment: vi.fn() } }))

const pendingReport: FinancialReport = {
  kind: 'payments',
  count: 1,
  total_pages: 1,
  next: null,
  previous: null,
  summary: {
    currencies: [{ currency: 'BRL', count: 1, total_amount: '50.00', confirmed_amount: '0.00', pending_amount: '50.00' }],
    statuses: { pending: 1 },
    coins: '0.00',
    bonus_applied: '0.00',
    total_credited: '0.00',
  },
  results: [{
    id: 'pending-mock',
    username: 'jogador_teste',
    amount: '50.00',
    currency: 'BRL',
    coins: '50.00',
    bonus_applied: '0.00',
    total_credited: '0.00',
    status: 'pending',
    method: 'mock',
    payment_source: 'simulation',
    created_at: '2026-09-01T16:00:00Z',
    paid_at: null,
  }],
}

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/panel/admin/reports/financial/payments']}>
        <Routes>
          <Route path="/panel/admin/reports/:category/:report" element={<AdminFinancialReportsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(financialReportsApi.get).mockResolvedValue(pendingReport)
  vi.mocked(staffApi.confirmMockPayment).mockResolvedValue({ id: 'pending-mock', coins: '50.00', status: 'confirmed' } as Awaited<ReturnType<typeof staffApi.confirmMockPayment>>)
})
afterEach(cleanup)

it('mostra aviso vermelho e só credita depois da confirmação explícita', async () => {
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Confirmar simulação' }))
  const dialog = await screen.findByRole('dialog', { name: 'Você vai creditar moedas sem pagamento real' })
  expect(dialog.className).toContain('finance-mock-confirm')
  expect(screen.getByRole('alert')).toHaveTextContent('Atenção')
  expect(screen.getByText(/libera saldo de verdade/i)).toBeTruthy()
  expect(staffApi.confirmMockPayment).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await user.click(screen.getByRole('button', { name: 'Confirmar simulação' }))
  await user.click(screen.getByRole('button', { name: 'Entendi o risco. Creditar mesmo assim' }))
  await waitFor(() => expect(staffApi.confirmMockPayment).toHaveBeenCalledWith('pending-mock'))
  expect(toast.success).toHaveBeenCalledWith('Simulação confirmada: 50.00 moedas creditadas para jogador_teste.')
})
