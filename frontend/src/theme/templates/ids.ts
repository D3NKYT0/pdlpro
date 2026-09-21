/** Layouts clássicos do catálogo público. Aliases `portal-v1` / `club-v1` continuam válidos. */
export const THEME_CATALOG_IDS = [
  'vesperlyn',
  'gemwright',
  'ironspine',
  'ashenledger',
  'warhorn',
  'ironpatch',
  'laurelwake',
  'meridian',
  'twinwake',
  'cartograph',
  'classing',
  'parchment',
  'obsidian',
  'hearthspire',
  'goldleaf',
  'lampmarket',
  'bracket',
  'eventide',
  'wayfarer',
  'watchfire',
] as const

export const THEME_RENDERER_ALIASES = {
  'portal-v1': 'gemwright',
  'club-v1': 'vesperlyn',
} as const

export type ThemeCatalogId = (typeof THEME_CATALOG_IDS)[number]
export type ThemeRendererAlias = keyof typeof THEME_RENDERER_ALIASES
export type ThemeRendererId = ThemeCatalogId | ThemeRendererAlias
