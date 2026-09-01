import { request } from '../infra/http'
import type { ApiGamerProfile, ApiUser } from '../types'

export type TwoFactorChallenge = { requires_2fa: true; challenge: string }

export function isTwoFactorChallenge(value: unknown): value is TwoFactorChallenge {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as TwoFactorChallenge).requires_2fa === true &&
      typeof (value as TwoFactorChallenge).challenge === 'string',
  )
}

export const authApi = {
  csrf: () => request<{ csrfToken: string }>('/auth/csrf/'),
  login: (login: string, password: string) =>
    request<ApiUser | TwoFactorChallenge>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),
  verifyTwoFactor: (challenge: string, code: string) =>
    request<ApiUser>('/auth/2fa/verify/', {
      method: 'POST',
      body: JSON.stringify({ challenge, code }),
    }),
  setupTwoFactor: () =>
    request<{ secret: string; otpauth_url: string; enabled: boolean }>('/shared/me/2fa/', {
      method: 'POST',
      body: JSON.stringify({ action: 'setup' }),
    }),
  confirmTwoFactor: (code: string) =>
    request<{ enabled: boolean }>('/shared/me/2fa/', {
      method: 'POST',
      body: JSON.stringify({ action: 'confirm', code }),
    }),
  disableTwoFactor: (code: string) =>
    request<{ enabled: boolean }>('/shared/me/2fa/', {
      method: 'POST',
      body: JSON.stringify({ action: 'disable', code }),
    }),
  progress: () => request<ApiGamerProfile>('/shared/me/progress/'),
  claimReward: (rewardId: string) =>
    request<{ claimed: boolean; item_name: string }>(`/shared/me/rewards/${rewardId}/claim/`, { method: 'POST' }),
  register: (payload: {
    username: string
    email: string
    password: string
    display_name?: string
    accept_terms: boolean
  }) => request<ApiUser>('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
  requestEmailVerification: () => request<{ sent: boolean; already_verified: boolean }>('/auth/email/verify/request/', { method: 'POST' }),
  verifyEmail: (token: string) => request<{ verified: boolean }>('/auth/email/verify/', { method: 'POST', body: JSON.stringify({ token }) }),
  requestPasswordReset: (email: string) =>
    request<{ sent: boolean }>('/auth/password-reset/', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmPasswordReset: (token: string, password: string) =>
    request<{ reset: boolean }>('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  logout: () => request<{ ok: boolean }>('/auth/logout/', { method: 'POST' }),
  me: () => request<ApiUser>('/shared/me/'),
  updateMe: (payload: { display_name?: string; bio?: string } | FormData) =>
    request<ApiUser>('/shared/me/', {
      method: 'PATCH',
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
}
