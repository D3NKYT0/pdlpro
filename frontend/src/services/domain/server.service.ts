import { request } from '../infra/http'
import type { ApiRankingEntry, ApiServerStatus } from '../types'

export const serverApi = {
  status: () => request<ApiServerStatus>('/public/server/status/'),
  rankings: (kind: string) => request<ApiRankingEntry[]>(`/public/server/rankings/${kind}/`),
  world: (name: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString()
    return request<Record<string, string | number | boolean | null>[]>(
      `/public/server/world/${name}/${query ? `?${query}` : ''}`,
    )
  },
}
