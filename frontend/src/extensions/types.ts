import type { ReactNode } from 'react'

/** Escopo de layout onde a rota da extensão é montada no router do core. */
export type ExtensionRouteScope = 'public' | 'panel' | 'staff'

/** Encaixes de UI no chrome do core. A extensão não substitui a página, só acrescenta. */
export type ExtensionSlot = 'panel.dashboard' | 'character.aside' | 'admin.hub'

export type ExtensionRoute = {
  /** Caminho relativo ao prefixo `/ext/<id>/` (ex.: `ping` → `/ext/example/ping`). */
  path: string
  element: ReactNode
  scope: ExtensionRouteScope
  /** Código Programs (`ext.<id>.<slug>`) para o ResourceGate. */
  resource?: string
}

export type ExtensionNavItem = {
  /** Caminho relativo a `/ext/<id>/`, igual ao da rota. */
  path: string
  scope: ExtensionRouteScope
  /** Chave i18n no namespace `ext.<id>` (ou `namespace`). */
  labelKey: string
  /** Opcional: subtítulo no hub staff (`ext.<id>`). */
  descriptionKey?: string
  namespace?: string
  resource?: string
}

export type ExtensionSlotItem = {
  slot: ExtensionSlot
  element: ReactNode
  resource?: string
}

export type ExtensionModule = {
  /** Identificador estável; deve coincidir com a pasta (sem `_` inicial) e `VITE_PDL_EXTENSIONS`. */
  id: string
  routes: ExtensionRoute[]
  /** Itens de menu genéricos; o core não lista telas de cliente à mão. */
  nav?: ExtensionNavItem[]
  /** Blocos injetados em páginas do core. */
  slots?: ExtensionSlotItem[]
}

export type ResolvedExtensionNavItem = {
  to: string
  labelKey: string
  descriptionKey?: string
  ns: string
  scope: ExtensionRouteScope
  resource?: string
}

export type ResolvedExtensionSlot = {
  key: string
  slot: ExtensionSlot
  element: ReactNode
  resource?: string
}

export type ResourceFlag = { code: string; enabled: boolean }

export function isExtensionResourceEnabled(
  resources: ResourceFlag[] | undefined,
  code: string | undefined,
): boolean {
  if (!code) return true
  return !resources?.some((row) => row.code === code && !row.enabled)
}
