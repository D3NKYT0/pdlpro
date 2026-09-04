import { request } from '../infra/http'
import type { ApiNews } from '../types'

export interface ApiWikiPage {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  category: string
  icon: string
  is_menu_item: boolean
}

export interface ApiCalendarEvent {
  id: string
  title: string
  description: string
  starts_at: string
  ends_at: string
  color: string
}

export interface ApiFaq {
  id: string
  question: string
  short_answer: string
  answer: string
  category: string
  category_label: string
  keywords: string[]
  audience: 'public' | 'staff' | 'superadmin'
  audience_label: string
  language?: 'pt' | 'en'
}

export interface ApiAssistantReply {
  language: 'pt' | 'en'
  kind: 'knowledge' | 'unknown' | 'blocked'
  engine: 'sentence-transformers+rapidfuzz' | 'rapidfuzz' | 'moderation'
  confidence?: number
  article_id?: string
  related_ids?: string[]
  answer: { text: string; details?: string | null; source?: string; pose: string }
}

export const contentApi = {
  news: () => request<ApiNews[]>('/public/news/'),
  newsDetail: (slug: string) => request<ApiNews>(`/public/news/${slug}/`),
  faq: (language: 'pt' | 'en' = 'pt') => request<ApiFaq[]>(`/public/faq/${language === 'en' ? '?lang=en' : ''}`),
  authenticatedFaq: (language: 'pt' | 'en' = 'pt') => request<ApiFaq[]>(`/shared/content/faq/${language === 'en' ? '?lang=en' : ''}`),
  assistantReply: (message: string, language: 'pt' | 'en') => request<ApiAssistantReply>(
    '/shared/content/assistant/reply/',
    { method: 'POST', body: JSON.stringify({ message, language }) },
  ),
  downloads: () => request<Array<{ id: string; title: string; url: string; category: string }>>('/public/downloads/'),
  wiki: (q?: string) => request<ApiWikiPage[]>(`/public/wiki/${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  wikiPage: (slug: string) => request<ApiWikiPage>(`/public/wiki/${slug}/`),
  calendar: () => request<ApiCalendarEvent[]>('/public/calendar/'),
  legal: () => request<{ version: string; documents: Array<{ slug: string; title: string }> }>('/public/legal/'),
  legalDocument: (slug: string) =>
    request<{ slug: string; title: string; body: string; version: string }>(`/public/legal/${slug}/`),
}
