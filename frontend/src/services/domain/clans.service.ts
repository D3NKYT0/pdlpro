import { request } from '../infra/http'
import type { ApiClan, ApiClanApplication } from '../types'

export const clansApi = {
  list: () => request<ApiClan[]>('/public/clans/'),
  create: (payload: { name: string; description?: string; focus?: string; motd?: string }) =>
    request<ApiClan>('/customer/clans/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  apply: (clanId: string, payload: { char_name: string; message?: string }) =>
    request<ApiClanApplication>(`/customer/clans/${clanId}/apply/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  mine: () => request<ApiClanApplication[]>('/customer/clans/applications/'),
  inbox: (clanId: string) => request<ApiClanApplication[]>(`/customer/clans/${clanId}/applications/`),
  review: (applicationId: string, status: 'approved' | 'rejected') =>
    request<ApiClanApplication>(`/customer/clans/applications/${applicationId}/review/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
}
