/** Overlay de extensões de cliente na SPA. */

export type {
  ExtensionModule,
  ExtensionNavItem,
  ExtensionRoute,
  ExtensionRouteScope,
  ExtensionSlot,
  ExtensionSlotItem,
  ResolvedExtensionNavItem,
  ResolvedExtensionSlot,
  ResourceFlag,
} from './types'
export { isExtensionResourceEnabled } from './types'
export { EXTENSION_CATALOG } from './catalog'
export {
  EXTENSION_PATH_PREFIX,
  extensionAbsolutePath,
  extensionNavItems,
  extensionSlotItems,
  navItemsForScope,
  parseExtensionIds,
  resolveEnabledExtensions,
  routesForScope,
  slotsForName,
} from './registry'
export { extensionI18nResources, extensionNamespaceList, folderToExtensionNamespace } from './locales'
export { extensionRouteElements } from './ExtensionRoutes'
export { ExtensionSlotOutlet } from './ExtensionSlots'
export { extensionApi, listExtensionApiIds } from './http'
