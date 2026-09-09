import { request } from '../infra/http'
import type {
  ApiBagItem,
  ApiBattlePass,
  ApiDailyBonus,
  ApiEconomyState,
  ApiFishingState,
  ApiRouletteState,
  ApiSpinResult,
} from '../types'
import { sendJson } from './jsonRequest'

export type Reward = {
  kind: string
  quantity: number | string
  item_id?: number
  name?: string
  enchant?: number
}

export type RewardHistory = {
  id: string
  kind?: string
  label: string
  rewards: Reward[]
  created_at: string
}

export type BattleDetails = {
  auto_claim: boolean
  statistics: {
    xp?: number
    quests?: number
    exchanges?: number
    rewards?: number
  }
  history: RewardHistory[]
  quests: {
    id: string
    name: string
    description: string
    period: string
    target: number
    current: number
    xp: number
    claimed: boolean
  }[]
  exchanges: {
    id: string
    name: string
    required_item_id: number
    required_enchant: number
    required_quantity: number
    owned: number
    rewards: Reward[]
    limit: number
    used: number
  }[]
  milestones: {
    id: string
    name: string
    required_xp: number
    rewards: Reward[]
    claimed: boolean
  }[]
}

export type DailyDetails = {
  season: {
    id: string
    name: string
    ends_on: string
    current_day: number
  } | null
  claimed: boolean
  days: { day: number; rewards: Reward[] }[]
  pool: { name: string; weight: number; rewards: Reward[] }[]
  history: RewardHistory[]
}

export type FishingDetails = {
  baits: {
    id: string
    name: string
    description: string
    price: number
    success_bonus: number
    quantity: number
  }[]
  collection: { id: string; name: string; rarity: string; count: number }[]
}

export type GameStats = {
  plays: number
  wins: number
  payout: number
  leaderboard: { username: string; score: number; wins: number }[]
}

export const gamesApi = {
  roulette: () => request<ApiRouletteState>('/customer/games/roulette/'),
  spin: () => request<ApiSpinResult>('/customer/games/roulette/', { method: 'POST' }),
  buyTokens: (amount: number) =>
    request<{ fichas: number }>('/customer/games/tokens/', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  dailyBonus: () => request<ApiDailyBonus>('/customer/games/daily-bonus/'),
  claimDailyBonus: () => request<ApiDailyBonus>('/customer/games/daily-bonus/', { method: 'POST' }),
  bag: () => request<ApiBagItem[]>('/customer/games/bag/'),
  transferBag: (inventory_id: string) =>
    request<{ moved: number }>('/customer/games/bag/', {
      method: 'POST',
      body: JSON.stringify({ inventory_id }),
    }),
  boxes: () =>
    request<{
      types: Array<{ id: string; name: string; price: string; boosters_amount: number }>
      boxes: Array<{ id: string; type_name: string; remaining: number; total: number }>
    }>('/customer/games/boxes/'),
  buyBox: (box_type_id: string) =>
    request<{ id: string; remaining: number }>('/customer/games/boxes/', {
      method: 'POST',
      body: JSON.stringify({ box_type_id }),
    }),
  openBox: (boxId: string) =>
    request<{
      item: { name: string; rarity: string; enchant: number }
      remaining: number
      fichas: number
    }>(`/customer/games/boxes/${boxId}/open/`, { method: 'POST' }),
  minigames: () =>
    request<{
      fichas: number
      dice: { active: boolean; min_bet: number }
      slots: { active: boolean; cost: number; symbols: string[] }
    }>('/customer/games/minigames/'),
  dice: (payload: { bet_type: string; amount: number; number?: number }) =>
    request<{ roll: number; won: boolean; payout: number; fichas: number }>(
      '/customer/games/dice/',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  slots: () =>
    request<{ reels: string[]; won: boolean; payout: number; fichas: number }>(
      '/customer/games/slots/',
      {
        method: 'POST',
      },
    ),
  fishing: () => request<ApiFishingState>('/customer/games/fishing/'),
  cast: (bait_id?: string) =>
    request<{
      success: boolean
      fish: { name: string; rarity: string } | null
      rod: { level: number; xp: number }
      fichas: number
    }>('/customer/games/fishing/', { method: 'POST', body: JSON.stringify({ bait_id }) }),
  economy: () => request<ApiEconomyState>('/customer/games/economy/'),
  fight: (monsterId: string) =>
    request<{
      won: boolean
      rounds: number
      fragments_earned: number
      weapon: { level: number; fragments: number }
      fichas: number
    }>(`/customer/games/economy/${monsterId}/fight/`, { method: 'POST' }),
  enchant: () =>
    request<{ success: boolean; weapon: { level: number; fragments: number } }>(
      '/customer/games/economy/enchant/',
      { method: 'POST' },
    ),
  battlePass: () => request<ApiBattlePass>('/customer/games/battle-pass/'),
  claimBattlePass: (rewardId: string) =>
    request<{ claimed: boolean; item_name: string }>(
      `/customer/games/battle-pass/${rewardId}/claim/`,
      { method: 'POST' },
    ),
  buyBattlePassPremium: () =>
    request<{ has_premium: boolean }>('/customer/games/battle-pass/', { method: 'POST' }),

  battleDetails: () => request<BattleDetails>('/customer/games/battle-pass/details/'),
  battleAction: (action: string, entry_id?: string, enabled?: boolean) =>
    sendJson<BattleDetails>('/customer/games/battle-pass/details/', {
      action,
      entry_id,
      enabled,
    }),
  dailyDetails: () => request<DailyDetails>('/customer/games/daily-bonus/details/'),
  fishingDetails: () => request<FishingDetails>('/customer/games/fishing/details/'),
  buyBait: (bait_id: string, quantity: number) =>
    sendJson('/customer/games/fishing/details/', { bait_id, quantity }),
  stats: (kind: string) => request<GameStats>(`/customer/games/statistics/${kind}/`),
}
