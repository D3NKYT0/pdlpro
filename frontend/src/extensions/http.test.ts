import { describe, expect, it } from 'vitest'
import { extensionApi, listExtensionApiIds } from './http'

describe('extensionApi', () => {
  it('descobre o cliente HTTP do skeleton', () => {
    expect(listExtensionApiIds()).toContain('example')
    const api = extensionApi<{ ping: () => Promise<unknown> }>('example')
    expect(api).toBeDefined()
    expect(typeof api?.ping).toBe('function')
  })

  it('devolve undefined para id fora do catálogo', () => {
    expect(extensionApi('missing')).toBeUndefined()
  })
})
