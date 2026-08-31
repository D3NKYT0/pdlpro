import { request } from '../infra/http'
import type { ApiShopItem } from '../types'

export const shopApi = {
  catalog: () => request<ApiShopItem[]>('/shared/shop/catalog/'),
  addToCart: (item_id: string, quantity = 1) =>
    request('/shared/shop/cart/', { method: 'POST', body: JSON.stringify({ item_id, quantity }) }),
  checkout: () => request('/shared/shop/checkout/', { method: 'POST' }),
}
