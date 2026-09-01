import { request } from '../infra/http'
import type { ApiCart, ApiShopItem } from '../types'

export const shopApi = {
  catalog: () => request<ApiShopItem[]>('/shared/shop/catalog/'),
  cart: () => request<ApiCart>('/shared/shop/cart/'),
  addToCart: (item_id: string, quantity = 1) =>
    request<ApiCart>('/shared/shop/cart/', { method: 'POST', body: JSON.stringify({ item_id, quantity }) }),
  updateCartItem: (id: string, quantity: number) =>
    request<ApiCart>(`/shared/shop/cart/${id}/`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  removeCartItem: (id: string) => request<ApiCart>(`/shared/shop/cart/${id}/`, { method: 'DELETE' }),
  checkout: () => request<{ purchase_id: string; total: string }>('/shared/shop/checkout/', { method: 'POST' }),
}
