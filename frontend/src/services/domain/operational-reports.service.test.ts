import { afterEach, expect, it, vi } from 'vitest'
import { operationalReportsApi } from './operational-reports.service'
import { request } from '../infra/http'

vi.mock('../infra/http', () => ({ request: vi.fn() }))
afterEach(() => { vi.resetAllMocks() })

it.each(['inventory', 'auctions', 'purchases', 'marketplace'] as const)('preserva filtros e cancelamento no relatório %s', async (kind) => {
  const signal = new AbortController().signal
  vi.mocked(request).mockResolvedValue({ results: [], count: 0, total_pages: 1, next: null, previous: null, summary: {} })
  expect(await operationalReportsApi.get(kind, new URLSearchParams({ q: 'a & b', page: '2' }), signal)).toEqual({
    kind, results: [], count: 0, total_pages: 1, next: null, previous: null, summary: {},
  })
  expect(request).toHaveBeenCalledWith(`/staff/operational-reports/${kind}/?q=a+%26+b&page=2`, { signal })
})
