import { request } from '../infra/http'
import type { ApiBonusPreview, ApiPaymentOrder } from '../types'

export const paymentApi = {
  list: () => request<ApiPaymentOrder[]>('/customer/payments/'),
  create: (amount: string, method = 'mock') =>
    request<ApiPaymentOrder>('/customer/payments/', {
      method: 'POST',
      body: JSON.stringify({ amount, method }),
    }),
  preview: (amount: string) =>
    request<ApiBonusPreview>('/customer/payments/preview/', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  confirm: (orderId: string) =>
    request<ApiPaymentOrder>(`/customer/payments/${orderId}/confirm/`, { method: 'POST' }),
  cancel: (orderId: string) =>
    request<ApiPaymentOrder>(`/customer/payments/${orderId}/cancel/`, { method: 'POST' }),
}
