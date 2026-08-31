import { request } from '../infra/http'
import type { ApiUser } from '../types'

export const authApi = {
  csrf: () => request<{ csrfToken: string }>('/auth/csrf/'),
  login: (login: string, password: string) =>
    request<ApiUser>('/auth/login/', { method: 'POST', body: JSON.stringify({ login, password }) }),
  register: (payload: { username: string; email: string; password: string; display_name?: string }) =>
    request<ApiUser>('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request<{ ok: boolean }>('/auth/logout/', { method: 'POST' }),
  me: () => request<ApiUser>('/shared/me/'),
  updateMe: (payload: { display_name?: string; bio?: string }) =>
    request<ApiUser>('/shared/me/', { method: 'PATCH', body: JSON.stringify(payload) }),
}
