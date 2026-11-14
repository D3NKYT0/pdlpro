import type { Resource } from '../services/api'

/** Merge theme links and shell actions once per destination, preserving the theme's label/order. */
export function uniqueNavigation<T extends { to: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.to)) return false
    seen.add(item.to)
    return true
  })
}

export const ROUTE_RESOURCE_MAP: Record<string, string> = {
  '/wiki': 'wiki',
  '/news': 'news',
  '/rankings': 'rankings',
  '/downloads': 'downloads',
  '/roadmap': 'roadmap',
  '/faq': 'faq',
  '/stores': 'game-stores',
}

/** Verifica se um destino de navegação está liberado com base nos recursos do sistema. */
export function isNavigationItemEnabled(to: string, resources?: Resource[]): boolean {
  if (!resources || !resources.length) return true
  const resourceCode = ROUTE_RESOURCE_MAP[to]
  if (!resourceCode) return true
  return !resources.some((r) => r.code === resourceCode && !r.enabled)
}
