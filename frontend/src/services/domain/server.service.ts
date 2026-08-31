import { request } from '../infra/http'
import type { ApiRankingEntry, ApiServerStatus } from '../types'

export const serverApi = {
  status: () => request<ApiServerStatus>('/public/server/status/'),
  rankings: (kind: string) => request<ApiRankingEntry[]>(`/public/server/rankings/${kind}/`),
}
