import { request } from '../infra/http'
import type { ApiBagItem, ApiDailyBonus, ApiRouletteState, ApiSpinResult } from '../types'

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
}
