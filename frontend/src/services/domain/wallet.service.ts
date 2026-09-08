import { request } from '../infra/http'
import type { ApiPage, ApiWallet, ApiWalletTransaction } from '../types'

function listQuery(params?: { page?: number; page_size?: number }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.page_size) query.set('page_size', String(params.page_size))
  const suffix = query.toString()
  return suffix ? `?${suffix}` : ''
}

export const walletApi = {
  me: () => request<ApiWallet>('/shared/wallet/'),
  transfer: (recipient_username: string, amount: string, description = '') =>
    request<ApiWallet>('/shared/wallet/transfer/', {
      method: 'POST',
      body: JSON.stringify({ recipient_username, amount, description }),
    }),
  transactions: (params?: { page?: number; page_size?: number }) =>
    request<ApiPage<ApiWalletTransaction>>(`/shared/wallet/transactions/${listQuery(params)}`),
}
