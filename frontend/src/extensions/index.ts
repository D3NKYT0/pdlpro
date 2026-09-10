/** Overlay de extensões de cliente na SPA. */

export type { ExtensionModule, ExtensionRoute, ExtensionRouteScope } from './types'
export { EXTENSION_CATALOG } from './catalog'
export {
  EXTENSION_PATH_PREFIX,
  extensionAbsolutePath,
  parseExtensionIds,
  resolveEnabledExtensions,
  routesForScope,
} from './registry'
export { extensionRouteElements } from './ExtensionRoutes'
