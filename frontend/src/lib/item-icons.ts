import type { ItemCatalogResponse, L2CatalogItem } from '../services/domain/catalog.service'

export type { ItemCatalogResponse, L2CatalogItem }
export { ITEM_CATALOG_KEY } from '../services/domain/catalog.service'

export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type IndexedCatalog = ItemCatalogResponse & {
  byId: Map<string, L2CatalogItem>
  searchable: { item: L2CatalogItem; normalized: string }[]
}

const indexes = new WeakMap<ItemCatalogResponse, IndexedCatalog>()

export function indexItemCatalog(data: ItemCatalogResponse): IndexedCatalog {
  const cached = indexes.get(data)
  if (cached) return cached
  const indexed = {
    ...data,
    byId: new Map(data.items.map((item) => [String(item.id), item])),
    searchable: data.items.map((item) => ({ item, normalized: normalizeItemName(item.name) })),
  }
  indexes.set(data, indexed)
  return indexed
}

export function searchCatalog(
  data: ReturnType<typeof indexItemCatalog> | undefined,
  query: string,
  limit = 20,
): L2CatalogItem[] {
  const trimmed = query.trim().replace(/^#/, '')
  if (!data || !trimmed) return []
  if (/^\d+$/.test(trimmed)) {
    const exact = data.byId.get(trimmed)
    return exact
      ? [exact]
      : data.items.filter((item) => item.id.startsWith(trimmed)).slice(0, limit)
  }
  const normalized = normalizeItemName(trimmed)
  if (normalized.length < 2) return []
  const starts: L2CatalogItem[] = []
  const contains: L2CatalogItem[] = []
  for (const { item, normalized: name } of data.searchable) {
    if (name.startsWith(normalized)) starts.push(item)
    else if (name.includes(normalized)) contains.push(item)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}
