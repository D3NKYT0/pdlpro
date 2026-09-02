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

export interface ThemePresentation {
  renderer: 'portal-v1'
  navigation: ThemeNavigationItem[]
  home: {
    hero: {
      title: string
      description: string
      countdownLabel: string
      countdownAt: string
      actionLabel: string
      actionTo: string
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
  }
  footer: { tagline: string; copyright: string }
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
