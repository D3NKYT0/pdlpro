import { request } from '../infra/http'

export interface ApiFriend {
  id: string
  username: string
  user_id: string
  accepted: boolean
}

export interface ApiFriendsState {
  friends: ApiFriend[]
  incoming: ApiFriend[]
  outgoing: ApiFriend[]
}

export interface ApiChatMessage {
  id: string
  sender: string
  text: string
  is_read: boolean
  created_at: string
}

export const friendsApi = {
  list: () => request<ApiFriendsState>('/customer/friends/'),
  search: (q: string) => request<Array<{ id: string; username: string }>>(`/customer/friends/?q=${encodeURIComponent(q)}`),
  request: (username: string) =>
    request<ApiFriend>('/customer/friends/', { method: 'POST', body: JSON.stringify({ username }) }),
  action: (id: string, action: 'accept' | 'reject' | 'cancel' | 'remove') =>
    request(`/customer/friends/${id}/${action}/`, { method: 'POST' }),
  messages: (username: string) => request<ApiChatMessage[]>(`/customer/messages/?username=${encodeURIComponent(username)}`),
  send: (username: string, text: string) =>
    request<ApiChatMessage>('/customer/messages/', {
      method: 'POST',
      body: JSON.stringify({ username, text }),
    }),
}
