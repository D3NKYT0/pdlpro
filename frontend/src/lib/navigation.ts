import type { Resource } from '../services/api'

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
