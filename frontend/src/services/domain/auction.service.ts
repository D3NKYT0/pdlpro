import { request } from '../infra/http'
import type { ApiAuction } from '../types'

export type CreateItemAuctionPayload = {
  kind?: 'item'
  inventory_id: string
  item_id: number
  quantity: number
  enchant: number
  min_bid: string
  hours: number
}

export type CreateCharacterAuctionPayload = {
  kind: 'character'
  char_id: number
  login?: string
  min_bid: string
  hours: number
}

export const auctionApi = {
  open: () => request<ApiAuction[]>('/public/auctions/'),
  mine: () => request<ApiAuction[]>('/customer/auctions/'),
  create: (payload: CreateItemAuctionPayload | CreateCharacterAuctionPayload) =>
    request<ApiAuction>('/customer/auctions/', {
      method: 'POST',
      body: JSON.stringify(payload.kind === 'character' ? payload : { kind: 'item', ...payload }),
    }),
  bid: (auctionId: string, amount: string, character_name = '') =>
    request(`/customer/auctions/${auctionId}/bid/`, {
      method: 'POST',
      body: JSON.stringify({ amount, character_name }),
    }),
}
