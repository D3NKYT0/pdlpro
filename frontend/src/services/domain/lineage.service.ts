import { request } from '../infra/http'

export interface ApiGameAccount {
  login: string
  email: string
  linked_user_id: string | null
}

export interface ApiAccessibleAccount {
  login: string
  is_primary: boolean
  linked: boolean
}

export interface ApiGameCharacter {
  char_id: number
  name: string
  level: number
  online: boolean
  sex: number
  pvp: number
  pk: number
  class_id: number
  title: string
  clan_name: string
  is_clan_leader: boolean
}

export interface ApiServicePrices {
  CHANGE_NICKNAME: string
  CHANGE_SEX: string
  LINK_SLOT: string
  UNSTUCK: string
}

export interface ApiInventoryRow {
  inventory_id: string
  character_name: string
  account_name: string
  character: ApiGameCharacter
  items: Array<{
    id: string
    inventory_id: string
    item_id: number
    item_name: string
    quantity: number
    enchant: number
  }>
}

export interface ApiGameItem {
  item_id: number
  name: string
  quantity: number
  enchant: number
}

export interface ApiCharacterEquipmentItem extends ApiGameItem {
  slot: number
}

export const lineageApi = {
  accounts: () =>
    request<{ accounts: ApiAccessibleAccount[]; slots: { used: number; total: number; can_link: boolean } }>(
      '/customer/server/accounts/',
    ),
  register: (password: string) =>
    request<ApiGameAccount>('/customer/server/accounts/register/', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  link: (login: string, password: string) =>
    request<ApiGameAccount>('/customer/server/accounts/link/', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),
  requestLinkByEmail: (email: string) =>
    request<{ sent: boolean }>('/customer/server/accounts/link-email/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  confirmLinkByEmail: (token: string) =>
    request<ApiGameAccount>('/customer/server/accounts/link-email/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  unlink: (login: string) =>
    request('/customer/server/accounts/unlink/', { method: 'POST', body: JSON.stringify({ login }) }),
  characters: (login?: string) =>
    request<ApiGameCharacter[]>(`/customer/server/characters/${login ? `?login=${encodeURIComponent(login)}` : ''}`),
  character: (login: string, charId: number) =>
    request<ApiGameCharacter>(
      `/customer/server/characters/${charId}/?login=${encodeURIComponent(login)}`,
    ),
  servicePrices: () => request<ApiServicePrices>('/customer/server/services/'),
  changeNickname: (login: string, char_id: number, name: string) =>
    request('/customer/server/characters/nickname/', {
      method: 'POST',
      body: JSON.stringify({ login, char_id, name }),
    }),
  changeSex: (login: string, char_id: number, sex: 'M' | 'F') =>
    request('/customer/server/characters/sex/', {
      method: 'POST',
      body: JSON.stringify({ login, char_id, sex }),
    }),
  unstuck: (login: string, char_id: number) =>
    request('/customer/server/characters/unstuck/', {
      method: 'POST',
      body: JSON.stringify({ login, char_id }),
    }),
}

export const inventoryApi = {
  dashboard: (login?: string) =>
    request<ApiInventoryRow[]>(`/customer/inventory/${login ? `?login=${encodeURIComponent(login)}` : ''}`),
  gameItems: (charId: number, login?: string) =>
    request<ApiGameItem[]>(
      `/customer/inventory/characters/${charId}/items/${login ? `?login=${encodeURIComponent(login)}` : ''}`,
    ),
  equipment: (charId: number, login?: string) =>
    request<ApiCharacterEquipmentItem[]>(
      `/customer/inventory/characters/${charId}/equipment/${login ? `?login=${encodeURIComponent(login)}` : ''}`,
    ),
  withdraw: (payload: { login?: string; char_id: number; item_id: number; quantity: number }) =>
    request('/customer/inventory/withdraw/', { method: 'POST', body: JSON.stringify(payload) }),
  deposit: (payload: {
    login?: string
    inventory_id: string
    item_id: number
    quantity: number
    enchant: number
  }) => request('/customer/inventory/deposit/', { method: 'POST', body: JSON.stringify(payload) }),
  trade: (payload: {
    origin_inventory_id: string
    destination_inventory_id: string
    item_id: number
    quantity: number
    enchant: number
  }) => request('/customer/inventory/trade/', { method: 'POST', body: JSON.stringify(payload) }),
}
