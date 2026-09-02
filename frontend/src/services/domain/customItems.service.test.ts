import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../infra/http'
import { customItemFormData, customItemsApi, type CustomItemInput } from './customItems.service'

vi.mock('../infra/http', () => ({ request: vi.fn().mockResolvedValue({}) }))
const item: CustomItemInput = { item_id: '900001', name: 'Medalha', category: 'COMUM', grade: 'S', tradeable: true, active: true, metadata: { raridade: 'raro' }, image: null }

describe('custom item uploads', () => {
  beforeEach(() => vi.clearAllMocks())
  it('encodes metadata and image together in multipart data', () => {
    const image = new File(['image'], 'medalha.png', { type: 'image/png' })
    const data = customItemFormData({ ...item, image })
    expect(data.get('image')).toBe(image)
    expect(data.get('metadata')).toBe('{"raridade":"raro"}')
    expect(data.get('item_id')).toBe('900001')
    expect(data.get('tradeable')).toBe('true')
  })
  it('omits an unchanged image and uses UUID for edits', async () => {
    await customItemsApi.save(item, 'custom-uuid')
    const [url, options] = vi.mocked(request).mock.calls[0]
    expect(url).toBe('/staff/custom-items/custom-uuid/')
    expect(options?.method).toBe('PATCH')
    expect(options?.headers).toBeUndefined()
    expect((options?.body as FormData).has('image')).toBe(false)
  })
  it('creates through POST and deactivates without deletion', async () => {
    await customItemsApi.save(item)
    expect(request).toHaveBeenLastCalledWith('/staff/custom-items/', expect.objectContaining({ method: 'POST' }))
    await customItemsApi.activate('custom-uuid', false)
    expect(request).toHaveBeenLastCalledWith('/staff/custom-items/custom-uuid/', { method: 'PATCH', body: '{"active":false}' })
  })
})
