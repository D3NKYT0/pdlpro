import { request } from '../infra/http'
import type { ApiBonusPreview, ApiPaymentCatalog, ApiPaymentOrder } from '../types'

export const paymentApi = {
  catalog: () => request<ApiPaymentCatalog>('/customer/payments/catalog/'),
  list: () => request<ApiPaymentOrder[]>('/customer/payments/'),
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
