import { describe, expect, it } from 'vitest'
import { isExtensionResourceEnabled } from './types'

describe('isExtensionResourceEnabled', () => {
  it('libera quando não há código de recurso', () => {
    expect(isExtensionResourceEnabled(undefined, undefined)).toBe(true)
    expect(isExtensionResourceEnabled([{ code: 'shop', enabled: false }], undefined)).toBe(true)
  })

  it('libera enquanto a lista ainda não chegou', () => {
    expect(isExtensionResourceEnabled(undefined, 'ext.example.ping')).toBe(true)
  })

  it('esconde só o código pausado', () => {
    const rows = [
      { code: 'ext.example.ping', enabled: false },
      { code: 'shop', enabled: true },
    ]
    expect(isExtensionResourceEnabled(rows, 'ext.example.ping')).toBe(false)
    expect(isExtensionResourceEnabled(rows, 'shop')).toBe(true)
    expect(isExtensionResourceEnabled(rows, 'ext.other.desk')).toBe(true)
  })
})
