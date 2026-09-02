import { request } from '../infra/http'

export interface ApiPanelSettings {
  id: string | null
  slogan: string
  name: string
  description: string
  chronicle: string
  rates: Record<string, string>
  enchant: Record<string, string>
  max_level: number
  features: string[]
  notes: Record<string, string>
  coming_soon: boolean
  staff_only_login: boolean
  is_active: boolean
}

export interface ApiStaffService {
  code: string
  name: string
  price: string
  active: boolean
}

export interface ApiStaffCoin {
  id: string | null
  name: string
  coin_id: number
  multiplier: string
  usd_multiplier: string
  withdraw_fee_percent: string
  active: boolean
}

export interface ApiStaffShopItem {
  id: string
  name: string
  item_id: number
  price: string
  quantity: number
  active: boolean
}

export interface ApiStaffNews {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  is_published: boolean
  published_at: string | null
}

export interface ApiStaffGame {
  id: string
  code: string
  name: string
  active: boolean
  settings: Record<string, unknown>
}

export interface ApiStaffGameAccount {
  login: string
  email: string
  linked: boolean
  linked_user_id: string | null
  panel_username: string | null
}

export const staffApi = {
  panel: () => request<ApiPanelSettings>('/staff/panel/'),
  savePanel: (payload: Partial<ApiPanelSettings>) =>
    request<ApiPanelSettings>('/staff/panel/', { method: 'PUT', body: JSON.stringify(payload) }),
  services: () => request<ApiStaffService[]>('/staff/services/'),
  saveServices: (items: ApiStaffService[]) =>
    request<ApiStaffService[]>('/staff/services/', { method: 'PUT', body: JSON.stringify(items) }),
  coins: () => request<ApiStaffCoin>('/staff/coins/'),
  saveCoins: (payload: Partial<ApiStaffCoin>) =>
    request<ApiStaffCoin>('/staff/coins/', { method: 'PUT', body: JSON.stringify(payload) }),
  shop: () => request<ApiStaffShopItem[]>('/staff/shop/'),
  saveShopItem: (payload: Partial<ApiStaffShopItem>) =>
    request<ApiStaffShopItem>('/staff/shop/', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }),
  news: () => request<ApiStaffNews[]>('/staff/news/'),
  saveNews: (payload: Partial<ApiStaffNews>) =>
    request<ApiStaffNews>('/staff/news/', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }),
  games: () => request<ApiStaffGame[]>('/staff/games/'),
  saveGame: (payload: Partial<ApiStaffGame>) =>
    request<ApiStaffGame>('/staff/games/', { method: 'PUT', body: JSON.stringify(payload) }),
  inspectAccount: (login: string) =>
    request<ApiStaffGameAccount>(`/staff/accounts/?login=${encodeURIComponent(login)}`),
  unlinkAccount: (login: string) =>
    request<ApiStaffGameAccount>('/staff/accounts/unlink/', {
      method: 'POST',
      body: JSON.stringify({ login }),
    }),
}
