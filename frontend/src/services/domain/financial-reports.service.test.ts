import { afterEach, expect, it, vi } from 'vitest'
import { financialReportsApi } from './financial-reports.service'
import { request } from '../infra/http'

vi.mock('../infra/http', () => ({ request: vi.fn() }))
afterEach(() => { vi.resetAllMocks() })
it.each(['balances', 'reconciliation', 'cash-flow', 'payments'] as const)('preserva filtros e cancelamento no relatório %s', async kind => {
  const signal = new AbortController().signal
  vi.mocked(request).mockResolvedValue({ results: [], count: 0 })
  expect(await financialReportsApi.get(kind, new URLSearchParams({ q: 'a & b', page: '2' }), signal)).toEqual({ kind, results: [], count: 0 })
  expect(request).toHaveBeenCalledWith(`/staff/financial-reports/${kind}/?q=a+%26+b&page=2`, { signal })
})
