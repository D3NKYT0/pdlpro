import { request } from '../infra/http'
import type { ApiNotificationList } from '../types'

export const notificationApi = {
  list: () => request<ApiNotificationList>('/customer/notifications/'),
  markRead: (id: string) => request(`/customer/notifications/${id}/read/`, { method: 'POST' }),
  markAllRead: () => request('/customer/notifications/read-all/', { method: 'POST' }),
}
