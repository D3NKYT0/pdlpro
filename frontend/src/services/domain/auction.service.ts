import { request } from '../infra/http'
import type { ApiAuction } from '../types'

export const auctionApi = {
  open: () => request<ApiAuction[]>('/public/auctions/'),
  mine: () => request<ApiAuction[]>('/customer/auctions/'),
  create: (payload: {
    inventory_id: string
    item_id: number
    quantity: number
    enchant: number
    min_bid: string
    hours: number
  }) =>
    request<ApiAuction>('/customer/auctions/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  bid: (auctionId: string, amount: string, character_name: string) =>
    request(`/customer/auctions/${auctionId}/bid/`, {
      method: 'POST',
      body: JSON.stringify({ amount, character_name }),
    }),
}
