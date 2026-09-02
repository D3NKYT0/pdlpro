import { request } from '../infra/http'

export type Resource = { id: string; code: string; name: string; category: string; enabled: boolean; description: string }
export type RoadmapEntry = { id: string; title: string; description: string; category: string; status: string; progress: number; target_date: string | null; published: boolean; order: number; updated_at: string }
export type Supporter = { id: string; username: string; name: string; channel_url: string; description: string; image: string | null; status: string; review_note: string; commission_percent: string }
export type Payout = { id: string; supporter_name: string; amount: string; status: string; note: string; created_at: string }
export type SupporterState = { profile: Supporter | null; available: string; coupons: {code: string; percent: string; active: boolean; uses: number}[]; payouts: Payout[]; commissions: {id: string; amount: string; status: string; created_at: string}[] }
export type Reward = { kind: string; quantity: number | string; item_id?: number; name?: string; enchant?: number }
export type RewardHistory = { id: string; kind?: string; label: string; rewards: Reward[]; created_at: string }
export type BattleDetails = {
  auto_claim: boolean; statistics: {xp?: number; quests?: number; exchanges?: number; rewards?: number}; history: RewardHistory[];
  quests: {id: string; name: string; description: string; period: string; target: number; current: number; xp: number; claimed: boolean}[];
  exchanges: {id: string; name: string; required_item_id: number; required_enchant: number; required_quantity: number; owned: number; rewards: Reward[]; limit: number; used: number}[];
  milestones: {id: string; name: string; required_xp: number; rewards: Reward[]; claimed: boolean}[];
}
export type DailyDetails = { season: {id: string; name: string; ends_on: string; current_day: number} | null; claimed: boolean; days: {day: number; rewards: Reward[]}[]; pool: {name: string; weight: number; rewards: Reward[]}[]; history: RewardHistory[] }
export type FishingDetails = {baits: {id: string; name: string; description: string; price: number; success_bonus: number; quantity: number}[]; collection: {id: string; name: string; rarity: string; count: number}[]}
export type GameStats = {plays: number; wins: number; payout: number; leaderboard: {username: string; score: number}[]}
export type ConfigRow = {id: string; [key: string]: unknown}

export const send = <T,>(url: string, data: unknown, method = 'POST') => request<T>(url, {method, body: JSON.stringify(data)})
export const programsApi = {
  resources: () => request<Resource[]>('/public/resources/'),
  toggleResource: (id: string, enabled: boolean) => send<Resource>(`/staff/resources/${id}/`, {enabled}, 'PATCH'),
  roadmap: (staff = false) => request<RoadmapEntry[]>(`/${staff ? 'staff' : 'public'}/roadmap/`),
  roadmapDetail: (id: string) => request<RoadmapEntry>(`/public/roadmap/${id}/`),
  saveRoadmap: (data: Partial<RoadmapEntry>, id?: string) => send<RoadmapEntry>(`/staff/roadmap/${id ? `${id}/` : ''}`, data, id ? 'PATCH' : 'POST'),
  deleteRoadmap: (id: string) => request<void>(`/staff/roadmap/${id}/`, {method: 'DELETE'}),
  supporter: () => request<SupporterState>('/customer/supporters/'),
  apply: (data: FormData) => request<SupporterState>('/customer/supporters/', {method: 'POST', body: data}),
  payout: () => send<Payout>('/customer/supporters/payout/', {}),
  staffSupporters: () => request<{supporters: Supporter[]; payouts: Payout[]}>('/staff/supporters/'),
  reviewSupporter: (id: string, data: unknown) => send(`/staff/supporters/${id}/`, data, 'PATCH'),
  reviewPayout: (id: string, status: string) => send(`/staff/supporter-payouts/${id}/`, {status}, 'PATCH'),
  battle: () => request<BattleDetails>('/customer/games/battle-pass/details/'),
  battleAction: (action: string, entry_id?: string, enabled?: boolean) => send<BattleDetails>('/customer/games/battle-pass/details/', {action, entry_id, enabled}),
  daily: () => request<DailyDetails>('/customer/games/daily-bonus/details/'),
  fishing: () => request<FishingDetails>('/customer/games/fishing/details/'),
  buyBait: (bait_id: string, quantity: number) => send('/customer/games/fishing/details/', {bait_id, quantity}),
  stats: (kind: string) => request<GameStats>(`/customer/games/statistics/${kind}/`),
  configs: (kind: string) => request<ConfigRow[]>(`/staff/game-content/${kind}/`),
  saveConfig: (kind: string, data: unknown, id?: string) => send<ConfigRow>(`/staff/game-content/${kind}/${id ? `${id}/` : ''}`, data, id ? 'PATCH' : 'POST'),
}
