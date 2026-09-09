import { request } from '../infra/http'

/** POST/PATCH JSON helper shared by domain API objects (no cross-service imports). */
export const sendJson = <T>(url: string, data: unknown, method = 'POST') =>
  request<T>(url, { method, body: JSON.stringify(data) })
