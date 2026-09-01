import l2ItemsJson from '../data/l2-items.json'

export type ItemCategory =
  | 'WEAPON'
  | 'SHIELD'
  | 'HELMET'
  | 'ARMOR'
  | 'PANTS'
  | 'BOOTS'
  | 'GLOVES'
  | 'NECKLACE'
  | 'EARRING'
  | 'RING'
  | 'HAIR'
  | 'FACE'
  | 'UNDERWEAR'
  | 'FORMAL'
  | 'PET'
  | 'COMUM'

export type ItemGrade = 'NG' | 'D' | 'C' | 'B' | 'A' | 'S'

type L2ItemEntry = [id: string, name: string, category: ItemCategory, grade: ItemGrade]

const L2_ITEMS = l2ItemsJson as L2ItemEntry[]

export interface L2CatalogItem {
  id: string
  name: string
  category: ItemCategory
  grade: ItemGrade
}

export const L2_ITEM_CATALOG: L2CatalogItem[] = L2_ITEMS.filter(
  ([, name]) => name && !/not in use/i.test(name),
).map(([id, name, category, grade]) => ({ id, name, category, grade }))

export const DEFAULT_ITEM_ICON = '/item-icons/default.jpg'

const ITEM_ICON_ID_OVERRIDES: Record<string, string> = {
  '858': '11598',
  '889': '11597',
  '920': '11596',
}

export function getItemIconPath(id: string | number): string {
  const raw = String(id)
  const fileId = ITEM_ICON_ID_OVERRIDES[raw] ?? raw
  return `/item-icons/${fileId}.jpg`
}

export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const idToItem = new Map<string, L2CatalogItem>()
const nameToItem = new Map<string, L2CatalogItem>()
for (const item of L2_ITEM_CATALOG) {
  if (!idToItem.has(item.id)) idToItem.set(item.id, item)
  const key = normalizeItemName(item.name)
  if (key && !nameToItem.has(key)) nameToItem.set(key, item)
}

export function getL2CatalogItemById(id: string | number | null | undefined): L2CatalogItem | null {
  if (id === null || id === undefined || id === '') return null
  const raw = String(id).trim().replace(/^l2:/i, '')
  if (!/^\d+$/.test(raw)) return null
  return idToItem.get(raw) ?? null
}

export function getL2CatalogItem(name: string | null | undefined): L2CatalogItem | null {
  if (!name) return null
  const key = normalizeItemName(name.replace(/\s*\+\d+\s*$/, ''))
  return nameToItem.get(key) ?? null
}

export function itemDisplayName(id: string | number | null | undefined, fallback?: string): string {
  const item = getL2CatalogItemById(id)
  if (item) return item.name
  return fallback || (id ? `Item ${id}` : 'Item')
}

export function searchL2Items(query: string, limit = 20): L2CatalogItem[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  if (/^\d+$/.test(trimmed)) {
    const exact = getL2CatalogItemById(trimmed)
    if (exact) return [exact]
    const matches: L2CatalogItem[] = []
    for (const item of L2_ITEM_CATALOG) {
      if (item.id.startsWith(trimmed)) {
        matches.push(item)
        if (matches.length >= limit) break
      }
    }
    return matches
  }

  const normalized = normalizeItemName(query)
  if (normalized.length < 2) return []
  const startsWith: L2CatalogItem[] = []
  const contains: L2CatalogItem[] = []
  for (const item of L2_ITEM_CATALOG) {
    const key = normalizeItemName(item.name)
    if (key.startsWith(normalized)) startsWith.push(item)
    else if (key.includes(normalized)) contains.push(item)
    if (startsWith.length >= limit) break
  }
  return [...startsWith, ...contains].slice(0, limit)
}
