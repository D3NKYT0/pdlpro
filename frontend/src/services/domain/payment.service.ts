import { request } from '../infra/http'
import type { ApiBonusPreview, ApiPage, ApiPaymentCatalog, ApiPaymentOrder } from '../types'

function listQuery(params?: { page?: number; page_size?: number }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.page_size) query.set('page_size', String(params.page_size))
  const suffix = query.toString()
  return suffix ? `?${suffix}` : ''
}

export const paymentApi = {
  catalog: () => request<ApiPaymentCatalog>('/customer/payments/catalog/'),
  list: (params?: { page?: number; page_size?: number }) =>
    request<ApiPage<ApiPaymentOrder>>(`/customer/payments/${listQuery(params)}`),
  create: (payload: { amount?: string; method?: string; currency?: string; package_id?: string }) =>
    request<ApiPaymentOrder>('/customer/payments/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  preview: (payload: { amount?: string; currency?: string; package_id?: string }) =>
    request<ApiBonusPreview>('/customer/payments/preview/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  confirm: (orderId: string) =>
    request<ApiPaymentOrder>(`/customer/payments/${orderId}/confirm/`, { method: 'POST' }),
  process: (orderId: string, payload: Record<string, unknown>) =>
    request<ApiPaymentOrder>(`/customer/payments/${orderId}/process/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  status: (orderId: string) => request<ApiPaymentOrder>(`/customer/payments/${orderId}/status/`),
  cancel: (orderId: string) =>
    request<ApiPaymentOrder>(`/customer/payments/${orderId}/cancel/`, { method: 'POST' }),
}
