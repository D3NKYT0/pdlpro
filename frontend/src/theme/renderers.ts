import { THEME_CATALOG_IDS, THEME_RENDERER_ALIASES, type ThemeRendererId } from './templates/ids'
import { isCatalogRenderer, isVesperlyn, resolveTemplateId } from './templates/resolve'

export const PACKAGED_RENDERERS = [
  ...THEME_CATALOG_IDS,
  ...(Object.keys(THEME_RENDERER_ALIASES) as Array<keyof typeof THEME_RENDERER_ALIASES>),
] as const

export type PackagedRenderer = ThemeRendererId

export function isPackagedRenderer(
  renderer: ThemeRendererId | string | null | undefined,
): renderer is PackagedRenderer {
  return isCatalogRenderer(renderer)
}

/** @deprecated Use `isVesperlyn` — `club-v1` é alias de Vesperlyn. */
export function isClubRenderer(
  renderer: ThemeRendererId | string | null | undefined,
): renderer is 'club-v1' | 'vesperlyn' {
  return isVesperlyn(renderer)
}

export { isVesperlyn, resolveTemplateId }
