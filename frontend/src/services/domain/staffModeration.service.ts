import { request } from '../infra/http'

export type ModerationStatus = 'all' | 'online' | 'offline' | 'banned' | 'jailed'
export type ModerationAction = 'kick' | 'jail' | 'unjail' | 'ban' | 'unban' | 'teleport'

export interface ApiModerationTown {
  id: string
  x: number
  y: number
  z: number
}

export interface ApiModerationLog {
  action: string
  actor_username: string
  char_id: number
  char_name: string
  login: string
  reason: string
  was_online: boolean
  details: Record<string, unknown>
  created_at: string
}

export interface ApiModerationCharacter {
  char_id: number
  name: string
  login: string
  email: string
  level: number
  online: boolean
  sex: number
  class_id: number
  title: string
  clan_name: string
  pvp: number
  pk: number
  karma: number
  online_time: number
  last_access: number
  account_access: number
  char_access: number
  x: number
  y: number
  z: number
  linked_user_id: string | null
  panel_username: string | null
  banned: boolean
  jailed: boolean
  jail_until: string | null
  jail_reason: string
  logs?: ApiModerationLog[]
  towns?: ApiModerationTown[]
}

export interface ApiModerationList {
  available: boolean
  results: ApiModerationCharacter[]
  count: number
  page: number
  pages: number
  towns: ApiModerationTown[]
}

export interface ApiModerationActionResult {
  action: ModerationAction
  was_online: boolean
  takes_effect: 'applied' | 'next_login'
  character: ApiModerationCharacter
}

export interface ModerationActionPayload {
  action: ModerationAction
  char_id: number
  reason?: string
  minutes?: number
  town?: string
}

function listPath(query: string, status: ModerationStatus, page: number) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status !== 'all') params.set('status', status)
  if (page > 1) params.set('page', String(page))
  const suffix = params.toString()
  return suffix ? `/staff/moderation/characters/?${suffix}` : '/staff/moderation/characters/'
}

export const staffModerationApi = {
  characters: (query = '', status: ModerationStatus = 'all', page = 1) =>
    request<ApiModerationList>(listPath(query, status, page)),
  character: (charId: number) =>
    request<ApiModerationCharacter>(`/staff/moderation/characters/${charId}/`),
  act: (payload: ModerationActionPayload) =>
    request<ApiModerationActionResult>('/staff/moderation/actions/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
