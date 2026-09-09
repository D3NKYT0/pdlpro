import { request } from '../infra/http'
import { sendJson } from './jsonRequest'

export type Resource = {
  id: string
  code: string
  name: string
  category: string
  enabled: boolean
  description: string
}

export type RoadmapEntry = {
  id: string
  title: string
  description: string
  category: string
  status: string
  progress: number
  target_date: string | null
  published: boolean
  order: number
  updated_at: string
}

export type Supporter = {
  id: string
  username: string
  name: string
  channel_url: string
  description: string
  image: string | null
  status: string
  review_note: string
  commission_percent: string
}

export type Payout = {
  id: string
  supporter_name: string
  amount: string
  status: string
  note: string
  created_at: string
}

export type SupporterState = {
  profile: Supporter | null
  available: string
  coupons: { code: string; percent: string; active: boolean; uses: number }[]
  payouts: Payout[]
  commissions: {
    id: string
    amount: string
    status: string
    created_at: string
  }[]
}

/** Product programs: resources, roadmap, supporters (not gameplay). */
export const programsApi = {
  resources: () => request<Resource[]>('/public/resources/'),
  toggleResource: (id: string, enabled: boolean) =>
    sendJson<Resource>(`/staff/resources/${id}/`, { enabled }, 'PATCH'),
  roadmap: (staff = false, language: 'pt' | 'en' | 'es' = 'pt') => {
    const params = new URLSearchParams()
    if (language !== 'pt') params.set('lang', language)
    const query = params.toString()
    const base = `/${staff ? 'staff' : 'public'}/roadmap/`
    return request<RoadmapEntry[]>(query ? `${base}?${query}` : base)
  },
  roadmapDetail: (id: string, language: 'pt' | 'en' | 'es' = 'pt') => {
    const params = language === 'pt' ? '' : `?lang=${language}`
    return request<RoadmapEntry>(`/public/roadmap/${id}/${params}`)
  },
  saveRoadmap: (data: Partial<RoadmapEntry>, id?: string) =>
    sendJson<RoadmapEntry>(
      `/staff/roadmap/${id ? `${id}/` : ''}`,
      data,
      id ? 'PATCH' : 'POST',
    ),
  deleteRoadmap: (id: string) =>
    request<void>(`/staff/roadmap/${id}/`, { method: 'DELETE' }),
  supporter: () => request<SupporterState>('/customer/supporters/'),
  apply: (data: FormData) =>
    request<SupporterState>('/customer/supporters/', {
      method: 'POST',
      body: data,
    }),
  payout: () => sendJson<Payout>('/customer/supporters/payout/', {}),
  staffSupporters: () =>
    request<{ supporters: Supporter[]; payouts: Payout[] }>('/staff/supporters/'),
  reviewSupporter: (id: string, data: unknown) =>
    sendJson(`/staff/supporters/${id}/`, data, 'PATCH'),
  reviewPayout: (id: string, status: string) =>
    sendJson(`/staff/supporter-payouts/${id}/`, { status }, 'PATCH'),
}
