import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { AdminFinancialReportsPage } from './AdminFinancialReportsPage'
import type { FinancialReport } from '../../services/domain/financial-reports.service'

const balanceData: FinancialReport = {
  kind: 'balances', count: 1, total_pages: 1, next: null, previous: null,
  summary: { balance: '80.00', bonus_balance: '10.00', total_balance: '90.00', calculated_balance: '90.00', difference: '0.00', absolute_difference: '0.00', credits: '110.00', debits: '20.00', transaction_count: 3, statuses: { consistent: 1, discrepancy: 0, review: 0, no_wallet: 0 } },
  results: [{ username: 'jogador_teste', balance: '80.00', bonus_balance: '10.00', total_balance: '90.00', calculated_balance: '90.00', difference: '0.00', credits: '110.00', debits: '20.00', transaction_count: 3, credit_count: 2, debit_count: 1, first_transaction: null, last_transaction: null, report_status: 'consistent' }],
}

function renderReport(data: FinancialReport, slug: string, search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['staff-financial-report', data.kind, search], data)
  try {
    return renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/painel/admin/financeiro/${slug}?${search}`]}><Routes><Route path="/painel/admin/financeiro/:report" element={<AdminFinancialReportsPage />} /></Routes></MemoryRouter></QueryClientProvider>)
  } finally {
    client.clear()
  }
}

describe('financial report rendering', () => {
  it('renders wallet balances with bonuses and restores URL filters', () => {
    const html = renderReport(balanceData, 'saldos', 'username=jogador&minimum=0')
    expect(html).toContain('jogador_teste')
    expect(html).toContain('90,00')
    expect(html).toContain('value="jogador"')
    expect(html).toContain('value="0"')
    expect(html).not.toContain('Carregando relatório')
    expect(html).not.toContain('R$')
  })

  it('renders reconciliation entries, exits and a signed discrepancy', () => {
    const html = renderReport({ ...balanceData, kind: 'reconciliation', results: [{ ...balanceData.results[0], difference: '-2.00', report_status: 'discrepancy' }] }, 'reconciliacao')
    expect(html).toContain('Entradas</th>')
    expect(html).toContain('Saídas</th>')
    expect(html).toContain('-2,00')
    expect(html).toContain('is-discrepancy')
  })

  it('keeps BRL and USD payment totals separate and identifies simulations', () => {
    const html = renderReport({
      kind: 'payments', count: 1, total_pages: 1, next: null, previous: null,
      summary: { currencies: [
        { currency: 'BRL', count: 1, total_amount: '100.00', confirmed_amount: '100.00', pending_amount: '0.00' },
        { currency: 'USD', count: 1, total_amount: '20.00', confirmed_amount: '20.00', pending_amount: '0.00' },
      ], statuses: { confirmed: 1 }, coins: '200.00', bonus_applied: '20.00', total_credited: '220.00' },
      results: [{ id: 'test-order', username: 'jogador_teste', amount: '100.00', currency: 'BRL', coins: '100.00', bonus_applied: '10.00', total_credited: '110.00', status: 'confirmed', method: 'mock', payment_source: 'simulation', created_at: '2026-09-01T16:00:00Z', paid_at: null }],
    }, 'pagamentos')
    expect(html).toContain('Reais · BRL')
    expect(html).toContain('Dólares · USD')
    expect(html).toContain('220,00')
    expect(html).toContain('Simulação')
    expect(html).not.toContain('NaN')
  })

  it('shows a cash flow chart with real values and handles no matching days', () => {
    const data: FinancialReport = {
      kind: 'cash-flow', count: 1, total_pages: 1, next: null, previous: null,
      summary: { credits: '50.00', debits: '20.00', net: '30.00', transaction_count: 2, days: 1, average_credits: '50.00', average_debits: '20.00' },
      results: [{ day: '2026-09-01', credits: '50.00', debits: '20.00', net: '30.00', accumulated: '30.00', transaction_count: 2, credit_count: 1, debit_count: 1 }],
    }
    const html = renderReport(data, 'fluxo-caixa')
    expect(html).toContain('01/09/2026')
    expect(html).toContain('height:40%')
    expect(html).toContain('30,00')
    const empty = renderReport({ ...data, results: [], count: 0 }, 'fluxo-caixa')
    expect(empty).toContain('Nenhum registro encontrado')
    expect(empty).not.toContain('finance-bars')
  })
})
