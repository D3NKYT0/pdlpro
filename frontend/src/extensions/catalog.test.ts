import { describe, expect, it } from 'vitest'
import { EXTENSION_CATALOG } from './catalog'

describe('EXTENSION_CATALOG', () => {
  it('descobre o skeleton example sem registro manual', () => {
    expect(EXTENSION_CATALOG.example?.id).toBe('example')
    expect(EXTENSION_CATALOG.example?.routes.some((route) => route.path === 'ping')).toBe(true)
  })
})
