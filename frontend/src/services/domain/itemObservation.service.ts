import { request } from '../infra/http'

export type ObservationAccess = {
  capture: boolean; delete_snapshots: boolean; add_categories: boolean
  change_categories: boolean; delete_categories: boolean
}
export type ItemCategory = { id: string; name: string; description: string; item_ids: number[]; order: number }
export type ItemCategoryInput = Omit<ItemCategory, 'id'>
export type ItemMetadata = { catalog_found?: boolean; item_type?: string | null; grade?: string | null; tradeable?: boolean | null; source?: 'xml' | 'custom' | null }
export type ObservedItem = ItemMetadata & {
  item_id: number; item_name: string; category_name: string; quantity: string
  instances: string; unique_owners: string; is_favorite?: boolean; location?: string
}
export type ObservationPage<T> = { results: T[]; count: number; page: number; pages: number }
export type ObservationLive = ObservationPage<ObservedItem> & {
  source: string
  totals: { total_quantity: string; total_instances: string; total_characters: string; site_quantity: string }
  locations: { location: string; quantity: string; instances: string; types: number }[]
  categories: ItemCategory[]
}
export type ItemSnapshot = {
  id: string; snapshot_date: string; source: string; created_at: string; created_by: string | null
  notes: string; total_characters: number; total_instances: number; total_quantity: string; site_quantity: string
}
export type ObservationDetail = ObservationPage<ObservedItem> & { snapshot: ItemSnapshot }
export type ItemChange = ItemMetadata & {
  item_id: number; item_name: string; location: string; before: string; after: string
  change: string; percentage: string | null
}
export type ObservationComparison = ObservationPage<ItemChange> & { before: ItemSnapshot; after: ItemSnapshot }
export type ObservationFilters = {
  search: string; minimum: string; category: string; favorites: boolean
  sort: 'quantity' | 'unique_owners' | 'instances' | 'name'; page: number
}

export function observationParams(filters: ObservationFilters) {
  const params = new URLSearchParams()
  params.set('page', String(filters.page))
  params.set('sort', filters.sort)
  if (filters.search.trim()) params.set('search', filters.search.trim())
  if (filters.minimum) params.set('minimum', filters.minimum)
  if (filters.category) params.set('category', filters.category)
  if (filters.favorites) params.set('favorites', 'true')
  return params.toString()
}

export function formatItemQuantity(value: string | number) {
  try { return BigInt(value).toLocaleString('pt-BR') } catch { return String(value) }
}

const BASE = '/staff/item-observation'
export const itemObservationApi = {
  access: () => request<ObservationAccess>(`${BASE}/access/`),
  live: (filters: ObservationFilters) => request<ObservationLive>(`${BASE}/?${observationParams(filters)}`),
  favorite: (id: number, active: boolean) => request(`${BASE}/favorites/${id}/`, { method: 'PUT', body: JSON.stringify({ active }) }),
  snapshots: (page: number) => request<ObservationPage<ItemSnapshot>>(`${BASE}/snapshots/?page=${page}`),
  capture: (notes: string) => request<ItemSnapshot>(`${BASE}/snapshots/`, { method: 'POST', body: JSON.stringify({ notes }) }),
  detail: (id: string, page: number) => request<ObservationDetail>(`${BASE}/snapshots/${encodeURIComponent(id)}/?page=${page}`),
  removeSnapshot: (id: string) => request<void>(`${BASE}/snapshots/${encodeURIComponent(id)}/`, { method: 'DELETE' }),
  compare: (before: string, after: string, page: number) => request<ObservationComparison>(
    `${BASE}/compare/?${new URLSearchParams({ before, after, page: String(page) })}`,
  ),
  categories: () => request<ItemCategory[]>(`${BASE}/categories/`),
  saveCategory: (payload: ItemCategoryInput, id?: string) => request<ItemCategory>(
    id ? `${BASE}/categories/${encodeURIComponent(id)}/` : `${BASE}/categories/`,
    { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) },
  ),
  removeCategory: (id: string) => request<void>(`${BASE}/categories/${encodeURIComponent(id)}/`, { method: 'DELETE' }),
}
