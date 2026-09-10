import type { ExtensionModule, ExtensionRouteScope } from './types'
import { EXTENSION_CATALOG } from './catalog'

/** Prefixo público das rotas SPA de extensão (espelha `/api/v1/extensions/` no backend). */
export const EXTENSION_PATH_PREFIX = '/ext'

export function parseExtensionIds(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function extensionAbsolutePath(extensionId: string, relativePath = ''): string {
  const base = `${EXTENSION_PATH_PREFIX}/${extensionId}`
  const clean = relativePath.replace(/^\/+/, '').replace(/\/+$/, '')
  return clean ? `${base}/${clean}` : base
}

/**
 * Resolve módulos habilitados por `VITE_PDL_EXTENSIONS` (lista separada por vírgula).
 * IDs desconhecidos no catálogo são ignorados (aviso em desenvolvimento).
 */
export function resolveEnabledExtensions(
  raw: string | undefined | null = import.meta.env.VITE_PDL_EXTENSIONS,
  catalog: Record<string, ExtensionModule> = EXTENSION_CATALOG,
): ExtensionModule[] {
  const ids = parseExtensionIds(raw)
  const missing = ids.filter((id) => !catalog[id])
  if (missing.length > 0 && import.meta.env.DEV) {
    console.warn(
      `[extensions] IDs não encontrados no catálogo: ${missing.join(', ')}. ` +
        'Registre o módulo em extensions/catalog.ts.',
    )
  }
  return ids.flatMap((id) => {
    const mod = catalog[id]
    return mod ? [mod] : []
  })
}

export function routesForScope(
  modules: ExtensionModule[],
  scope: ExtensionRouteScope,
): Array<{ key: string; path: string; element: ExtensionModule['routes'][number]['element'] }> {
  return modules.flatMap((mod) =>
    mod.routes
      .filter((route) => route.scope === scope)
      .map((route) => ({
        key: `${mod.id}:${route.scope}:${route.path}`,
        path: extensionAbsolutePath(mod.id, route.path),
        element: route.element,
      })),
  )
}
