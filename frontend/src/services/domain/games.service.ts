import { request } from '../infra/http'
import type { ApiBagItem, ApiBattlePass, ApiDailyBonus, ApiEconomyState, ApiFishingState, ApiRouletteState, ApiSpinResult } from '../types'

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
    request<{ item: { name: string; rarity: string; enchant: number }; remaining: number; fichas: number }>(
      `/customer/games/boxes/${boxId}/open/`,
      { method: 'POST' },
    ),
  minigames: () =>
    request<{
      fichas: number
      dice: { active: boolean; min_bet: number }
      slots: { active: boolean; cost: number; symbols: string[] }
    }>('/customer/games/minigames/'),
  dice: (payload: { bet_type: string; amount: number; number?: number }) =>
    request<{ roll: number; won: boolean; payout: number; fichas: number }>('/customer/games/dice/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  slots: () =>
    request<{ reels: string[]; won: boolean; payout: number; fichas: number }>('/customer/games/slots/', {
      method: 'POST',
    }),
  fishing: () => request<ApiFishingState>('/customer/games/fishing/'),
  cast: () =>
    request<{
      success: boolean
      fish: { name: string; rarity: string } | null
      rod: { level: number; xp: number }
      fichas: number
    }>('/customer/games/fishing/', { method: 'POST' }),
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
    request<{ claimed: boolean; item_name: string }>(`/customer/games/battle-pass/${rewardId}/claim/`, {
      method: 'POST',
    }),
  buyBattlePassPremium: () =>
    request<{ has_premium: boolean }>('/customer/games/battle-pass/', { method: 'POST' }),
}
