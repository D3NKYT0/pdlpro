import { request } from '../infra/http'

export interface ThemeNavigationItem {
  label: string
  to: string
}

export interface ThemeFeatureItem {
  title: string
  description: string
  asset: string
}

export interface ThemeRankingTab {
  id: string
  label: string
  kind: 'pvp' | 'pk' | 'clans' | 'level' | 'adena' | 'online'
}

import {
  THEME_CATALOG_IDS,
  THEME_RENDERER_ALIASES,
  type ThemeCatalogId,
  type ThemeRendererAlias,
  type ThemeRendererId,
} from '../../theme/templates/ids'

export type ThemeHomeSection = 'hero' | 'stats' | 'features' | 'pillars' | 'ranking' | 'cta' | 'news'

export { THEME_CATALOG_IDS, THEME_RENDERER_ALIASES }
export type { ThemeCatalogId, ThemeRendererAlias, ThemeRendererId }

export type ThemeStatKind = 'online' | 'chronicle' | 'rates' | 'status' | 'custom'

export interface ThemeStatItem {
  id: string
  label: string
  kind: ThemeStatKind
  value?: string
}

export interface ThemePillarItem {
  title: string
  description: string
}

export interface ThemePresentation {
  renderer: ThemeRendererId
  navigation: ThemeNavigationItem[]
  home: {
    hero: {
      title: string
      description: string
      countdownLabel: string
      countdownAt: string
      actionLabel: string
      actionTo: string
      kicker?: string
      subtitle?: string
      secondaryLabel?: string
      secondaryTo?: string
    }
    features: {
      title: string
      subtitle: string
      actionLabel: string
      actionTo: string
      items: ThemeFeatureItem[]
    }
    ranking: {
      title: string
      subtitle: string
      actionLabel: string
      actionTo: string
      tabs: ThemeRankingTab[]
    }
    cta: { title: string; description: string; actionLabel: string; actionTo: string }
    news: { title: string }
    stats?: { items: ThemeStatItem[] }
    pillars?: { title?: string; items: ThemePillarItem[] }
    /** Ordem e visibilidade das seções da home; omitido = ordem padrão completa. */
    sections?: ThemeHomeSection[]
  }
  footer: { tagline: string; copyright: string }
  shells?: {
    auth: { kicker: string; brand: string }
    panel: { kicker: string; brand: string }
    admin: { kicker: string; brand: string }
  }
}

export interface ThemeSiteMetadata {
  site: {
    name?: string
    slogan?: string
    description?: string
    title?: string
  }
  seo: {
    title?: string
    description?: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
  }
  social: {
    discordUrl?: string
    trailerYoutubeId?: string
  }
  server: {
    chronicle?: string
    maxLevel?: number
    rates?: Record<string, string>
    enchant?: Record<string, string>
    features?: string[]
    notes?: Record<string, string>
  }
}

export interface ThemeLayout {
  panel?: {
    sidebarWidth?: number
    density?: 'compact' | 'comfortable' | 'spacious'
    radius?: number
  }
  public?: {
    headerHeight?: number
    containerWidth?: number
  }
  surfaces?: {
    buttonPrimary?: string
    buttonSecondary?: string
    buttonTab?: string
  }
}

export interface ApiTheme {
  id: string
  package_id: string | null
  name: string
  version: string
  author: string
  description: string
  active: boolean
  builtin: boolean
  base_url: string
  stylesheet_url: string | null
  assets: Record<string, string>
  presentation?: ThemePresentation | null
  layout?: ThemeLayout | null
  metadata?: ThemeSiteMetadata | null
}

export const themeApi = {
  active: () => request<ApiTheme>('/public/theme/'),
  list: () => request<ApiTheme[]>('/staff/themes/'),
  install: (file: File) => {
    const body = new FormData()
    body.append('package', file)
    return request<ApiTheme>('/staff/themes/', { method: 'POST', body })
  },
  activate: (theme: ApiTheme) => request<ApiTheme>(
    theme.builtin ? '/staff/themes/default/activate/' : `/staff/themes/${theme.package_id}/activate/`,
    { method: 'POST', body: '{}' },
  ),
  remove: (theme: ApiTheme) => request<void>(`/staff/themes/${theme.package_id}/`, { method: 'DELETE' }),
}
