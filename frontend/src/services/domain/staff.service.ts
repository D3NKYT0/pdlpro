import { request } from '../infra/http'
import type { ApiPaymentOrder } from '../types'

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
  allow_registration: boolean
  allow_l2_registration: boolean
  coming_soon_show_info: boolean
  coming_soon_show_champions: boolean
  coming_soon_title: string
  coming_soon_subtitle: string
  coming_soon_at: string | null
  seo_title: string
  seo_description: string
  og_image: string
  discord_url: string
  whatsapp_url: string
  facebook_url: string
  instagram_url: string
  youtube_url: string
  trailer_youtube_id: string
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

export interface ApiStaffWalletPromo {
  id: string | null
  percent: string
  title: string
  description: string
  active: boolean
  starts_at: string | null
  ends_at: string | null
  currently_active: boolean
}

export interface ApiStaffShopItem {
  id: string
  name: string
  item_id: number
  price: string
  quantity: number
  active: boolean
}

export interface ApiStaffShopAutoconfig {
  created: { items: number; packages: number }
  items_total: number
  packages_total: number
}

export interface ApiStaffNews {
  id: string
  slug: string
  title: string
  title_en: string
  title_es: string
  excerpt: string
  excerpt_en: string
  excerpt_es: string
  body: string
  body_en: string
  body_es: string
  is_published: boolean
  published_at: string | null
}

export interface ApiStaffCalendarEvent {
  id: string
  title: string
  title_en: string
  title_es: string
  description: string
  description_en: string
  description_es: string
  starts_at: string | null
  ends_at: string | null
  color: string
  is_published: boolean
}

export interface ApiStaffFaq {
  id: string
  question: string
  short_answer: string
  answer: string
  question_en: string
  short_answer_en: string
  answer_en: string
  question_es: string
  short_answer_es: string
  answer_es: string
  category: string
  keywords: string
  keywords_en: string
  keywords_es: string
  audience: string
  assistant_only: boolean
  order: number
  is_published: boolean
}

export interface ApiStaffWikiPage {
  id: string
  slug: string
  title: string
  title_en: string
  title_es: string
  summary: string
  summary_en: string
  summary_es: string
  body: string
  body_en: string
  body_es: string
  category: string
  icon: string
  order: number
  is_published: boolean
  is_menu_item: boolean
}

export interface ApiStaffDownload {
  id: string
  title: string
  url: string
  category: string
  order: number
  is_published: boolean
}

export interface ApiStaffNotification {
  id: string
  user_id: string
  username: string
  title: string
  body: string
  kind: string
  link: string
  is_read: boolean
  created_at: string
  sent?: number
  broadcast?: boolean
}

export interface ApiStaffGame {
  id: string
  code: string
  name: string
  active: boolean
  settings: Record<string, unknown>
}

export interface ApiStaffGameAutoconfig {
  games: Array<{
    code: string
    name: string
    activated: boolean
    created: Record<string, number>
  }>
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
  walletPromo: () => request<ApiStaffWalletPromo>('/staff/wallet-promo/'),
  saveWalletPromo: (payload: Partial<ApiStaffWalletPromo>) =>
    request<ApiStaffWalletPromo>('/staff/wallet-promo/', { method: 'PUT', body: JSON.stringify(payload) }),
  shop: () => request<ApiStaffShopItem[]>('/staff/shop/'),
  saveShopItem: (payload: Partial<ApiStaffShopItem>) =>
    request<ApiStaffShopItem>('/staff/shop/', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }),
  autoconfigShop: () =>
    request<ApiStaffShopAutoconfig>('/staff/shop/autoconfig/', { method: 'POST', body: JSON.stringify({}) }),
  news: () => request<ApiStaffNews[]>('/staff/news/'),
  saveNews: (payload: Partial<ApiStaffNews>) =>
    request<ApiStaffNews>('/staff/news/', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }),
  calendar: () => request<ApiStaffCalendarEvent[]>('/staff/calendar/'),
  saveCalendar: (payload: Partial<ApiStaffCalendarEvent>) =>
    request<ApiStaffCalendarEvent>('/staff/calendar/', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }),
  deleteCalendar: (id: string) =>
    request<{ deleted: boolean }>('/staff/calendar/', { method: 'DELETE', body: JSON.stringify({ id }) }),
  faq: () => request<ApiStaffFaq[]>('/staff/faq/'),
  saveFaq: (payload: Partial<ApiStaffFaq>) =>
    request<ApiStaffFaq>('/staff/faq/', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }),
  deleteFaq: (id: string) =>
    request<{ deleted: boolean }>('/staff/faq/', { method: 'DELETE', body: JSON.stringify({ id }) }),
  wiki: () => request<ApiStaffWikiPage[]>('/staff/wiki/'),
  saveWiki: (payload: Partial<ApiStaffWikiPage>) =>
    request<ApiStaffWikiPage>('/staff/wiki/', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }),
  deleteWiki: (id: string) =>
    request<{ deleted: boolean }>('/staff/wiki/', { method: 'DELETE', body: JSON.stringify({ id }) }),
  downloads: () => request<ApiStaffDownload[]>('/staff/downloads/'),
  saveDownload: (payload: Partial<ApiStaffDownload>) =>
    request<ApiStaffDownload>('/staff/downloads/', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }),
  deleteDownload: (id: string) =>
    request<{ deleted: boolean }>('/staff/downloads/', { method: 'DELETE', body: JSON.stringify({ id }) }),
  notifications: (q?: string) =>
    request<ApiStaffNotification[]>(q ? `/staff/notifications/?q=${encodeURIComponent(q)}` : '/staff/notifications/'),
  sendNotification: (payload: { title: string; body?: string; kind?: string; link?: string; username?: string; broadcast?: boolean }) =>
    request<ApiStaffNotification>('/staff/notifications/', { method: 'POST', body: JSON.stringify(payload) }),
  deleteNotification: (id: string) =>
    request<{ deleted: boolean }>('/staff/notifications/', { method: 'DELETE', body: JSON.stringify({ id }) }),
  games: () => request<ApiStaffGame[]>('/staff/games/'),
  saveGame: (payload: Partial<ApiStaffGame>) =>
    request<ApiStaffGame>('/staff/games/', { method: 'PUT', body: JSON.stringify(payload) }),
  autoconfigGames: (code?: string) =>
    request<ApiStaffGameAutoconfig>('/staff/games/autoconfig/', {
      method: 'POST',
      body: JSON.stringify(code ? { code } : {}),
    }),
  inspectAccount: (login: string) =>
    request<ApiStaffGameAccount>(`/staff/accounts/?login=${encodeURIComponent(login)}`),
  unlinkAccount: (login: string) =>
    request<ApiStaffGameAccount>('/staff/accounts/unlink/', {
      method: 'POST',
      body: JSON.stringify({ login }),
    }),
  confirmMockPayment: (orderId: string) =>
    request<ApiPaymentOrder>(`/staff/payments/${orderId}/confirm-mock/`, { method: 'POST' }),
}
