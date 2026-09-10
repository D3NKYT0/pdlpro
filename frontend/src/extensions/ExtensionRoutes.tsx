import { Route } from 'react-router-dom'
import { resolveEnabledExtensions, routesForScope } from './registry'
import type { ExtensionRouteScope } from './types'

/**
 * Lista de `<Route>` do escopo pedido para as extensões ativas.
 * Deve ser espalhada como filho de `<Routes>` (RR não aceita wrapper customizado).
 */
export function extensionRouteElements(
  scope: ExtensionRouteScope,
  enabledIds?: string | null,
) {
  const modules = resolveEnabledExtensions(
    enabledIds ?? import.meta.env.VITE_PDL_EXTENSIONS,
  )
  return routesForScope(modules, scope).map((route) => (
    <Route key={route.key} path={route.path} element={route.element} />
  ))
}
