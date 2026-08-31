import { request } from '../infra/http'
import type { ApiComment, ApiPost } from '../types'

export const socialApi = {
  feed: () => request<ApiPost[]>('/public/feed/'),
  create: (body: string) =>
    request<ApiPost>('/customer/social/posts/', {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  like: (postId: string) =>
    request<{ liked: boolean; likes_count: number }>(`/customer/social/posts/${postId}/like/`, { method: 'POST' }),
  comments: (postId: string) => request<ApiComment[]>(`/customer/social/posts/${postId}/comments/`),
  comment: (postId: string, body: string) =>
    request<ApiComment>(`/customer/social/posts/${postId}/comments/`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  deleteComment: (commentId: string) =>
    request<{ deleted: boolean }>(`/customer/social/comments/${commentId}/`, { method: 'DELETE' }),
}
