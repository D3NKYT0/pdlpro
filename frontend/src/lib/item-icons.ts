import { useQuery } from '@tanstack/react-query'
import { request } from '../services/infra/http'

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

export function normalizeItemName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

type IndexedCatalog = ItemCatalogResponse & { byId: Map<string, L2CatalogItem>; searchable: { item: L2CatalogItem; normalized: string }[] }
const indexes = new WeakMap<ItemCatalogResponse, IndexedCatalog>()
export function indexItemCatalog(data: ItemCatalogResponse): IndexedCatalog {
  const cached = indexes.get(data)
  if (cached) return cached
  const indexed = {
    ...data,
    byId: new Map(data.items.map(item => [String(item.id), item])),
    searchable: data.items.map(item => ({ item, normalized: normalizeItemName(item.name) })),
  }
  indexes.set(data, indexed)
  return indexed
}

export function searchCatalog(data: ReturnType<typeof indexItemCatalog> | undefined, query: string, limit = 20): L2CatalogItem[] {
  const trimmed = query.trim().replace(/^#/, '')
  if (!data || !trimmed) return []
  if (/^\d+$/.test(trimmed)) {
    const exact = data.byId.get(trimmed)
    return exact ? [exact] : data.items.filter(item => item.id.startsWith(trimmed)).slice(0, limit)
  }
  const normalized = normalizeItemName(trimmed)
  if (normalized.length < 2) return []
  const starts: L2CatalogItem[] = [], contains: L2CatalogItem[] = []
  for (const { item, normalized: name } of data.searchable) {
    if (name.startsWith(normalized)) starts.push(item)
    else if (name.includes(normalized)) contains.push(item)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

// One shared cache populated by the backend's merged XML + custom catalog.
export function useItemCatalog() {
  const query = useQuery({
    queryKey: ITEM_CATALOG_KEY,
    queryFn: () => request<ItemCatalogResponse>('/public/items/catalog/', { cache: 'no-cache' }),
    select: indexItemCatalog,
    staleTime: 60_000,
    retry: false,
  })
  const getById = (id: string | number | null | undefined) => {
    const key = String(id ?? '').trim().replace(/^l2:/i, '')
    return query.data?.byId.get(key) ?? null
  }
  return { ...query, getById, search: (value: string, limit = 20) => searchCatalog(query.data, value, limit) }
}
