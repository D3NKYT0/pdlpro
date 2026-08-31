import { request } from '../infra/http'
import type { ApiPost } from '../types'

export const socialApi = {
  feed: () => request<ApiPost[]>('/public/feed/'),
  create: (body: string) =>
    request<ApiPost>('/customer/social/posts/', {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
}
