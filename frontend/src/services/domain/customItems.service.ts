import { request } from '../infra/http'

export type CustomItem = {
  id: string; item_id: number; name: string; icon_url: string | null; category: string; grade: string
  tradeable: boolean; active: boolean; metadata: Record<string, unknown>; conflicts_with_xml: boolean
}
export type CustomItemInput = {
  item_id: string; name: string; category: string; grade: string; tradeable: boolean; active: boolean
  metadata: Record<string, unknown>; image: File | null
}
export type CustomItemList = {
  results: CustomItem[]; count: number; page: number; pages: number
  permissions: { add: boolean; change: boolean }
  categories: { value: string; label: string }[]; grades: { value: string; label: string }[]
}
export function customItemFormData(item: CustomItemInput) {
  const data = new FormData()
  for (const key of ['item_id', 'name', 'category', 'grade', 'tradeable', 'active'] as const) data.set(key, String(item[key]))
  data.set('metadata', JSON.stringify(item.metadata))
  if (item.image) data.set('image', item.image)
  return data
}
export const customItemsApi = {
  list: (search = '', page = 1) => request<CustomItemList>(`/staff/custom-items/?${new URLSearchParams({ search, page: String(page) })}`),
  save: (item: CustomItemInput, id?: string) => request<CustomItem>(id ? `/staff/custom-items/${id}/` : '/staff/custom-items/', {
    method: id ? 'PATCH' : 'POST', body: customItemFormData(item),
  }),
  activate: (id: string, active: boolean) => request<CustomItem>(`/staff/custom-items/${id}/`, { method: 'PATCH', body: JSON.stringify({ active }) }),
}
