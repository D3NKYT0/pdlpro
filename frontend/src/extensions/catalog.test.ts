import { describe, expect, it } from 'vitest'
import { EXTENSION_CATALOG } from './catalog'

describe('EXTENSION_CATALOG', () => {
  it('descobre o skeleton example sem registro manual', () => {
    expect(EXTENSION_CATALOG.example?.id).toBe('example')
    expect(EXTENSION_CATALOG.example?.routes.some((route) => route.path === 'ping')).toBe(true)
    expect(EXTENSION_CATALOG.example?.routes[0]?.resource).toBe('ext.example.ping')
    expect(EXTENSION_CATALOG.example?.slots?.some((item) => item.slot === 'panel.dashboard')).toBe(true)
  })
})
