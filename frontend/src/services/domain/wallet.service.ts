import { request } from '../infra/http'
import type { ApiWallet } from '../types'

export const walletApi = {
  me: () => request<ApiWallet>('/shared/wallet/'),
  transfer: (recipient_username: string, amount: string, description = '') =>
    request<ApiWallet>('/shared/wallet/transfer/', {
      method: 'POST',
      body: JSON.stringify({ recipient_username, amount, description }),
    }),
  transactions: () => request<{ results: Array<Record<string, string>> }>('/shared/wallet/transactions/'),
}
