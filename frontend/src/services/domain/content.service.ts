import { request } from '../infra/http'
import type { ApiNews } from '../types'

export const contentApi = {
  news: () => request<ApiNews[]>('/public/news/'),
  newsDetail: (slug: string) => request<ApiNews>(`/public/news/${slug}/`),
  faq: () => request<Array<{ id: string; question: string; answer: string }>>('/public/faq/'),
  downloads: () => request<Array<{ id: string; title: string; url: string; category: string }>>('/public/downloads/'),
}
