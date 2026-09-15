import type { ReactNode } from 'react'

/** Escopo de layout onde a rota da extensão é montada no router do core. */
export type ExtensionRouteScope = 'public' | 'panel' | 'staff'

export type ExtensionRoute = {
  /** Caminho relativo ao prefixo `/ext/<id>/` (ex.: `ping` → `/ext/example/ping`). */
  path: string
  element: ReactNode
  scope: ExtensionRouteScope
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
}

export type ExtensionModule = {
  /** Identificador estável; deve coincidir com a pasta (sem `_` inicial) e `VITE_PDL_EXTENSIONS`. */
  id: string
  routes: ExtensionRoute[]
  /** Itens de menu genéricos; o core não lista telas de cliente à mão. */
  nav?: ExtensionNavItem[]
}

export type ResolvedExtensionNavItem = {
  to: string
  labelKey: string
  descriptionKey?: string
  ns: string
  scope: ExtensionRouteScope
}
