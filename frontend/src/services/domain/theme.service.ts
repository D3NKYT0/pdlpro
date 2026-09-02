import { request } from '../infra/http'

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

