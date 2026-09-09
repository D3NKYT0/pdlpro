import { request } from '../infra/http'
import type { ApiNews } from '../types'

export interface AssistantPreferences {
  preferred_name?: string
  detail?: 'brief' | 'balanced' | 'detailed'
}

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
  language?: 'pt' | 'en' | 'es'
}

export interface ApiAssistantReply {
  language: 'pt' | 'en' | 'es'
  kind: 'knowledge' | 'unknown' | 'blocked' | 'social' | 'crisis'
  engine: 'sentence-transformers+rapidfuzz' | 'rapidfuzz' | 'moderation' | 'conversation' | 'ollama' | 'remote' | 'safety'
  mode?: 'generative' | 'limited'
  context?: string
  confidence?: number
  article_id?: string
  related_ids?: string[]
  answer: { text: string; details?: string | null; source?: string; pose: string; action?: { label: string; url: string } }
  emotion?: {
    id: 'calm' | 'joyful' | 'amused' | 'sad' | 'sleepy' | 'surprised' | 'confused' | 'frustrated'
    pose: string
    idle_pose: string
    source: 'user' | 'needs' | 'default'
  }
}

export type DenkynhoAction = 'feed' | 'sleep' | 'play' | 'bath' | 'walk' | 'care' | 'dance'
export interface DenkynhoAppearance { scene?: string; accessory: string; outfit: string; object: string }
export interface DenkynhoUnlock { id: string; slot: keyof DenkynhoAppearance | 'interaction'; label: { pt: string; en: string }; level: number; unlocked: boolean }

export interface ApiDenkynhoProfile {
  appearance?: DenkynhoAppearance
  unlocks?: DenkynhoUnlock[]
  available_actions?: DenkynhoAction[]
  level: number
  experience: number
  experience_next: number
  attributes: {
    satiety: number
    energy: number
    happiness: number
    hygiene: number
  }
  emotion?: {
    id: 'calm' | 'joyful' | 'amused' | 'sad' | 'sleepy' | 'surprised' | 'confused' | 'frustrated'
    pose: string
    idle_pose: string
    source: 'user' | 'needs' | 'default'
  }
  preferences?: { preferred_name: string; detail: 'brief' | 'balanced' | 'detailed' }
  cue?: { id: string; message: { pt: string; en: string; es?: string } } | null
  daily_visit?: boolean
  visit_xp?: number
}

export interface ApiDenkynhoCareResult extends ApiDenkynhoProfile {
  level_up?: boolean
  unlocked?: string[]
  attributes_gained?: Partial<ApiDenkynhoProfile['attributes']>
  action: DenkynhoAction
  xp_gained: number
  replayed: boolean
}

export type ContentLanguage = 'pt' | 'en' | 'es'

function withLang(path: string, language: ContentLanguage = 'pt', extraQuery = '') {
  const params = new URLSearchParams(extraQuery)
  if (language !== 'pt') params.set('lang', language)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export const contentApi = {
  news: (language: ContentLanguage = 'pt') => request<ApiNews[]>(withLang('/public/news/', language)),
  newsDetail: (slug: string, language: ContentLanguage = 'pt') => request<ApiNews>(withLang(`/public/news/${slug}/`, language)),
  faq: (language: ContentLanguage = 'pt') => request<ApiFaq[]>(withLang('/public/faq/', language)),
  authenticatedFaq: (language: ContentLanguage = 'pt') => request<ApiFaq[]>(withLang('/shared/content/faq/', language)),
  assistantReply: (message: string, language: ContentLanguage, context?: string, preferences?: AssistantPreferences, screen?: string) => request<ApiAssistantReply>(
    '/shared/content/assistant/reply/',
    { method: 'POST', body: JSON.stringify({ message, language, ...(context !== undefined ? { conversation: true, context } : {}), ...(preferences ? { preferences } : {}), ...(screen ? { screen } : {}) }) },
  ),
  denkynho: () => request<ApiDenkynhoProfile>('/shared/content/assistant/pet/'),
  updateDenkynhoPreferences: (preferences: { preferred_name: string; detail: AssistantPreferences['detail'] }) => request<ApiDenkynhoProfile>('/shared/content/assistant/pet/', { method: 'PATCH', body: JSON.stringify(preferences) }),
  equipDenkynho: (slot: keyof DenkynhoAppearance, itemId: string) => request<ApiDenkynhoProfile>('/shared/content/assistant/pet/wardrobe/', { method: 'PATCH', body: JSON.stringify({ slot, item_id: itemId }) }),
  careDenkynho: (action: DenkynhoAction, idempotencyKey: string) => request<ApiDenkynhoCareResult>(
    '/shared/content/assistant/pet/',
    { method: 'POST', body: JSON.stringify({ action, idempotency_key: idempotencyKey }) },
  ),
  downloads: () => request<Array<{ id: string; title: string; url: string; category: string }>>('/public/downloads/'),
  wiki: (q?: string, language: ContentLanguage = 'pt') => request<ApiWikiPage[]>(withLang('/public/wiki/', language, q ? `q=${encodeURIComponent(q)}` : '')),
  wikiPage: (slug: string, language: ContentLanguage = 'pt') => request<ApiWikiPage>(withLang(`/public/wiki/${slug}/`, language)),
  calendar: () => request<ApiCalendarEvent[]>('/public/calendar/'),
  legal: (language: ContentLanguage = 'pt') => request<{ version: string; documents: Array<{ slug: string; title: string }> }>(withLang('/public/legal/', language)),
  legalDocument: (slug: string, language: ContentLanguage = 'pt') =>
    request<{ slug: string; title: string; body: string; version: string }>(withLang(`/public/legal/${slug}/`, language)),
}
