import { request } from '../infra/http'
import type { ApiSupportList, ApiSupportTicket } from '../types'

export const supportApi = {
  list: () => request<ApiSupportList>('/customer/support/'),
  detail: (id: string) => request<ApiSupportTicket>(`/customer/support/${id}/`),
  create: (payload: { subject: string; description: string; category: string; priority: string; context?: Record<string, string> }) =>
    request<ApiSupportTicket>('/customer/support/', { method: 'POST', body: JSON.stringify(payload) }),
  reply: (id: string, body: string) =>
    request<ApiSupportTicket>(`/customer/support/${id}/`, { method: 'POST', body: JSON.stringify({ body }) }),
  action: (id: string, action: 'close' | 'reopen') =>
    request<ApiSupportTicket>(`/customer/support/${id}/`, { method: 'PATCH', body: JSON.stringify({ action }) }),
}

export const staffSupportApi = {
  list: (filters: { status?: string; category?: string; q?: string } = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value))
    const suffix = params.size ? `?${params.toString()}` : ''
    return request<ApiSupportList>(`/staff/support/${suffix}`)
  },
  detail: (id: string) => request<ApiSupportTicket>(`/staff/support/${id}/`),
  reply: (id: string, body: string, is_internal = false) =>
    request<ApiSupportTicket>(`/staff/support/${id}/`, {
      method: 'POST',
      body: JSON.stringify({ body, is_internal }),
    }),
  update: (id: string, payload: { status?: string; priority?: string; assigned_to?: string | null }) =>
    request<ApiSupportTicket>(`/staff/support/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
}
