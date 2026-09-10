import type { ReactNode } from 'react'

/** Escopo de layout onde a rota da extensão é montada no router do core. */
export type ExtensionRouteScope = 'public' | 'panel' | 'staff'

export type ExtensionRoute = {
  /** Caminho relativo ao prefixo `/ext/<id>/` (ex.: `ping` → `/ext/example/ping`). */
  path: string
  element: ReactNode
  scope: ExtensionRouteScope
}

export type ExtensionModule = {
  /** Identificador estável; deve coincidir com a chave no catálogo e em `VITE_PDL_EXTENSIONS`. */
  id: string
  routes: ExtensionRoute[]
}
