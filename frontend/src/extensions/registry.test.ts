import { describe, expect, it, vi } from 'vitest'
import {
  extensionAbsolutePath,
  navItemsForScope,
  parseExtensionIds,
  resolveEnabledExtensions,
  routesForScope,
} from './registry'
import type { ExtensionModule } from './types'

const catalog: Record<string, ExtensionModule> = {
  example: {
    id: 'example',
    routes: [
      { path: 'ping', scope: 'public', element: null },
      { path: 'desk', scope: 'panel', element: null },
    ],
  },
  acme: {
    id: 'acme',
    routes: [{ path: '', scope: 'staff', element: null }],
    nav: [{ path: '', scope: 'staff', labelKey: 'nav.desk', descriptionKey: 'nav.deskHint' }],
  },
}

describe('parseExtensionIds', () => {
  it('aceita lista vazia', () => {
    expect(parseExtensionIds(undefined)).toEqual([])
    expect(parseExtensionIds('')).toEqual([])
    expect(parseExtensionIds('  ')).toEqual([])
  })

  it('separa por vírgula e remove espaços', () => {
    expect(parseExtensionIds('example, acme')).toEqual(['example', 'acme'])
  })
})

describe('extensionAbsolutePath', () => {
  it('monta /ext/<id> e segmentos relativos', () => {
    expect(extensionAbsolutePath('example')).toBe('/ext/example')
    expect(extensionAbsolutePath('example', 'ping')).toBe('/ext/example/ping')
    expect(extensionAbsolutePath('example', '/ping/')).toBe('/ext/example/ping')
  })
})

describe('resolveEnabledExtensions', () => {
  it('ignora IDs fora do catálogo', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveEnabledExtensions('example,missing', catalog).map((m) => m.id)).toEqual([
      'example',
    ])
    warn.mockRestore()
  })

  it('preserva a ordem do env', () => {
    expect(resolveEnabledExtensions('acme,example', catalog).map((m) => m.id)).toEqual([
      'acme',
      'example',
    ])
  })
})

describe('navItemsForScope', () => {
  it('monta links de menu no prefixo /ext/<id>', () => {
    const modules = resolveEnabledExtensions('example,acme', catalog)
    expect(navItemsForScope(modules, 'staff')).toEqual([
      expect.objectContaining({
        to: '/ext/acme',
        labelKey: 'nav.desk',
        descriptionKey: 'nav.deskHint',
        ns: 'ext.acme',
      }),
    ])
    expect(navItemsForScope(modules, 'public')).toEqual([])
  })
})

describe('routesForScope', () => {
  it('filtra pelo escopo e prefixa o path', () => {
    const modules = resolveEnabledExtensions('example,acme', catalog)
    expect(routesForScope(modules, 'public')).toEqual([
      expect.objectContaining({ path: '/ext/example/ping' }),
    ])
    expect(routesForScope(modules, 'staff')).toEqual([
      expect.objectContaining({ path: '/ext/acme' }),
    ])
  })
})
