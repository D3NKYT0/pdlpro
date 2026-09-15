/** Overlay de extensões de cliente na SPA. */

export type {
  ExtensionModule,
  ExtensionNavItem,
  ExtensionRoute,
  ExtensionRouteScope,
  ResolvedExtensionNavItem,
} from './types'
export { EXTENSION_CATALOG } from './catalog'
export {
  EXTENSION_PATH_PREFIX,
  extensionAbsolutePath,
  extensionNavItems,
  navItemsForScope,
  parseExtensionIds,
  resolveEnabledExtensions,
  routesForScope,
} from './registry'
export { extensionI18nResources, extensionNamespaceList, folderToExtensionNamespace } from './locales'
export { extensionRouteElements } from './ExtensionRoutes'
