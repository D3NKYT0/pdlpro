import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../infra/http'
import { itemObservationApi as api, observationParams, formatItemQuantity } from './itemObservation.service'

vi.mock('../infra/http', () => ({ request: vi.fn().mockResolvedValue({}) }))

describe('item observation service', () => {
  beforeEach(() => vi.clearAllMocks())
  it('encodes filters without losing integer precision', () => {
    const params = new URLSearchParams(observationParams({ search: ' Adena & itens ', minimum: '9007199254740993', category: 'Moedas raras', favorites: true, sort: 'unique_owners', page: 2 }))
    expect(params.get('search')).toBe('Adena & itens')
    expect(params.get('minimum')).toBe('9007199254740993')
    expect(params.get('category')).toBe('Moedas raras')
    expect(params.get('favorites')).toBe('true')
    expect(params.get('page')).toBe('2')
    expect(params.get('sort')).toBe('unique_owners')
  })
  it('formats large and negative quantities exactly', () => {
    expect(formatItemQuantity('9007199254740993')).toBe('9.007.199.254.740.993')
    expect(formatItemQuantity('-1234')).toBe('-1.234')
    expect(formatItemQuantity('0')).toBe('0')
  })
  it('uses protected staff endpoints for writes', async () => {
    await api.favorite(57, true)
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/favorites/57/', { method: 'PUT', body: '{"active":true}' })
    await api.capture('Baseline')
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/snapshots/', { method: 'POST', body: '{"notes":"Baseline"}' })
    await api.removeSnapshot('snapshot-uuid')
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/snapshots/snapshot-uuid/', { method: 'DELETE' })
  })
  it('reads live inventory, snapshots and categories', async () => {
    const filters = { search: '', minimum: '', category: '', favorites: false, sort: 'quantity' as const, page: 1 }
    await api.access()
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/access/')
    await api.live(filters)
    expect(request).toHaveBeenLastCalledWith(`/staff/item-observation/?${observationParams(filters)}`)
    await api.snapshots(2)
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/snapshots/?page=2')
    await api.detail('snap/id', 4)
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/snapshots/snap%2Fid/?page=4')
    await api.categories()
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/categories/')
  })
  it('uses UUIDs for history comparison and category edits', async () => {
    await api.compare('old-uuid', 'new-uuid', 3)
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/compare/?before=old-uuid&after=new-uuid&page=3')
    const category = { name: 'Moedas', description: '', item_ids: [57], order: 0 }
    await api.saveCategory(category)
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/categories/', { method: 'POST', body: JSON.stringify(category) })
    await api.saveCategory(category, 'category-uuid')
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/categories/category-uuid/', { method: 'PUT', body: JSON.stringify(category) })
    await api.removeCategory('category-uuid')
    expect(request).toHaveBeenLastCalledWith('/staff/item-observation/categories/category-uuid/', { method: 'DELETE' })
  })
  it('falls back when quantity is not an integer string', () => {
    expect(formatItemQuantity('not-a-number')).toBe('not-a-number')
  })
})
