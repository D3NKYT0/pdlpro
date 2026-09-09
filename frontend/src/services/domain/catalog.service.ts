import { request } from '../infra/http'

export interface L2CatalogItem {
  id: string
  name: string
  category: string | null
  grade: string | null
  icon_url: string
  icon_reference: string
  tradeable: boolean | null
  catalog_found: boolean
  source?: 'xml' | 'custom' | null
  metadata?: Record<string, unknown>
}

export type ItemCatalogResponse = { items: L2CatalogItem[]; default_icon_url: string }

export const ITEM_CATALOG_KEY = ['item-catalog'] as const

export const catalogApi = {
  list: () => request<ItemCatalogResponse>('/public/items/catalog/', { cache: 'no-cache' }),
}
