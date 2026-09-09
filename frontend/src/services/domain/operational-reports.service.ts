import { request } from '../infra/http'

export type OperationalReportKind = 'inventory' | 'auctions' | 'purchases' | 'marketplace'

interface ReportPage<Row = Record<string, unknown>, Summary = Record<string, unknown>> {
  count: number
  total_pages: number
  next: string | null
  previous: string | null
  results: Row[]
  summary: Summary
}

export type OperationalReport = ReportPage & { kind: OperationalReportKind }

export const operationalReportsApi = {
  async get(kind: OperationalReportKind, params: URLSearchParams, signal?: AbortSignal): Promise<OperationalReport> {
    const result = await request<Omit<OperationalReport, 'kind'>>(`/staff/operational-reports/${kind}/?${params}`, { signal })
    return { ...result, kind }
  },
}
