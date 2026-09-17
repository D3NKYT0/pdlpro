import { request } from '../infra/http'
import type { ApiRankingEntry, ApiServerInfo, ApiServerStatus } from '../types'

export type ApiGameStoreItem = {
  item_id: number
  name: string
  quantity: number
  price: number
  enchant: number
}

export type ApiGameStore = {
  char_id: number
  name: string
  store_type: 'sell' | 'buy' | 'package' | 'craft' | string
  title: string
  clan_name: string
  town: string
  x: number
  y: number
  z: number
  items: ApiGameStoreItem[]
}

export const serverApi = {
  info: () => request<ApiServerInfo>('/public/server/info/'),
  status: () => request<ApiServerStatus>('/public/server/status/'),
  rankings: (kind: string, limit?: number) =>
    request<ApiRankingEntry[]>(`/public/server/rankings/${kind}/${limit ? `?limit=${limit}` : ''}`),
  world: (name: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString()
    return request<Record<string, string | number | boolean | null>[]>(
      `/public/server/world/${name}/${query ? `?${query}` : ''}`,
    )
  },
  stores: (query = '', storeType = '') => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (storeType) params.set('type', storeType)
    const suffix = params.toString() ? `?${params}` : ''
    return request<{ available: boolean; stores: ApiGameStore[] }>(`/public/server/stores/${suffix}`)
  },
}
