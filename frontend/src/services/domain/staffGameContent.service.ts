import { request } from '../infra/http'
import { sendJson } from './jsonRequest'

export type ConfigRow = { id: string; [key: string]: unknown }

/** Staff CRUD for game-content kinds (battle pass, daily, fishing configs, …). */
export const staffGameContentApi = {
  configs: (kind: string) => request<ConfigRow[]>(`/staff/game-content/${kind}/`),
  saveConfig: (kind: string, data: unknown, id?: string) =>
    sendJson<ConfigRow>(
      `/staff/game-content/${kind}/${id ? `${id}/` : ''}`,
      data,
      id ? 'PATCH' : 'POST',
    ),
}
