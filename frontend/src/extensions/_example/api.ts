import { request } from '../../services/infra/http'

export type ExamplePingResponse = { ok: boolean; extension: string }

export const api = {
  ping: () => request<ExamplePingResponse>('/extensions/example_extension/ping/'),
}

export default api
