import { request } from '../infra/http'

export type FinancialReportKind = 'balances' | 'cash-flow' | 'payments' | 'reconciliation'
export type BalanceStatus = 'consistent' | 'review' | 'discrepancy' | 'no_wallet'
export type PaymentStatus = 'pending' | 'processing' | 'confirmed' | 'cancelled' | 'failed'

export interface BalanceReportRow {
  username: string
  balance: string
  bonus_balance: string
  total_balance: string
  calculated_balance: string
  difference: string
  credits: string
  debits: string
  transaction_count: number
  credit_count: number
  debit_count: number
  first_transaction: string | null
  last_transaction: string | null
  report_status: BalanceStatus
}

export interface CashFlowReportRow {
  day: string
  credits: string
  debits: string
  net: string
  accumulated: string
  transaction_count: number
  credit_count: number
  debit_count: number
}

export interface PaymentReportRow {
  id: string
  username: string
  amount: string
  currency: 'BRL' | 'USD'
  coins: string
  bonus_applied: string
  total_credited: string
  status: PaymentStatus
  method: string
  payment_source: 'simulation' | 'gateway' | 'unidentified'
  created_at: string
  paid_at: string | null
}

export interface BalanceReportSummary {
  balance: string
  bonus_balance: string
  total_balance: string
  calculated_balance: string
  difference: string
  absolute_difference: string
  credits: string
  debits: string
  transaction_count: number
  statuses: Record<BalanceStatus, number>
}

export interface CashFlowReportSummary {
  credits: string
  debits: string
  net: string
  transaction_count: number
  days: number
  average_credits: string
  average_debits: string
}

export interface PaymentReportSummary {
  currencies: { currency: 'BRL' | 'USD'; count: number; total_amount: string; confirmed_amount: string; pending_amount: string }[]
  statuses: Partial<Record<PaymentStatus, number>>
  coins: string
  bonus_applied: string
  total_credited: string
}

interface ReportPage<Row, Summary> {
  count: number
  total_pages: number
  next: string | null
  previous: string | null
  results: Row[]
  summary: Summary
}

export type FinancialReport =
  | ({ kind: 'balances' | 'reconciliation' } & ReportPage<BalanceReportRow, BalanceReportSummary>)
  | ({ kind: 'cash-flow' } & ReportPage<CashFlowReportRow, CashFlowReportSummary>)
  | ({ kind: 'payments' } & ReportPage<PaymentReportRow, PaymentReportSummary>)

export const financialReportsApi = {
  async get(kind: FinancialReportKind, params: URLSearchParams, signal?: AbortSignal): Promise<FinancialReport> {
    const result = await request<Omit<FinancialReport, 'kind'>>(`/staff/financial-reports/${kind}/?${params}`, { signal })
    return { ...result, kind } as FinancialReport
  },
}
