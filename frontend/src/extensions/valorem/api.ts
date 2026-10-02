import { request } from '../../services/infra/http'

export interface ValoremWikiStatusResponse {
  ok: boolean
  active: boolean
  version: string
  total_items: number
  total_bosses: number
  total_skills: number
}

export const api = {
  getWikiStatus: () =>
    request<ValoremWikiStatusResponse>('/api/v1/extensions/valorem/wiki/status/'),
}

export default api
