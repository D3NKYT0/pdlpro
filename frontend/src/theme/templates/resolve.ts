import { PUBLIC_TEMPLATES, type PublicTemplate } from './catalog'
import { THEME_CATALOG_IDS, THEME_RENDERER_ALIASES, type ThemeCatalogId, type ThemeRendererId } from './ids'

const CATALOG_SET = new Set<string>(THEME_CATALOG_IDS)

export function resolveTemplateId(
  renderer: ThemeRendererId | string | null | undefined,
): ThemeCatalogId | null {
  if (!renderer) return null
  if (renderer in THEME_RENDERER_ALIASES) {
    return THEME_RENDERER_ALIASES[renderer as keyof typeof THEME_RENDERER_ALIASES]
  }
  return CATALOG_SET.has(renderer) ? (renderer as ThemeCatalogId) : null
}

export function resolveTemplate(
  renderer: ThemeRendererId | string | null | undefined,
): PublicTemplate | null {
  const id = resolveTemplateId(renderer)
  return id ? PUBLIC_TEMPLATES[id] : null
}

export function isCatalogRenderer(
  renderer: ThemeRendererId | string | null | undefined,
): renderer is ThemeRendererId {
  return resolveTemplateId(renderer) !== null
}

export function isVesperlyn(renderer: ThemeRendererId | string | null | undefined) {
  return resolveTemplateId(renderer) === 'vesperlyn'
}

export function isGemwright(renderer: ThemeRendererId | string | null | undefined) {
  return resolveTemplateId(renderer) === 'gemwright'
}
