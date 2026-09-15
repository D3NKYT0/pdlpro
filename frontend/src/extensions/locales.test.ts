import { describe, expect, it } from 'vitest'
import { extensionI18nResources, extensionNamespaceList, folderToExtensionNamespace } from './locales'

describe('extension locales', () => {
  it('mapeia pasta _example para namespace ext.example', () => {
    expect(folderToExtensionNamespace('_example')).toBe('ext.example')
    expect(folderToExtensionNamespace('acme')).toBe('ext.acme')
  })

  it('carrega pt/en/es do skeleton', () => {
    const resources = extensionI18nResources()
    expect(extensionNamespaceList(resources)).toContain('ext.example')
    expect(resources.pt['ext.example']).toMatchObject({
      nav: { ping: 'Ping da extensão' },
      slot: { dashboard: expect.stringContaining('Painel') },
    })
    expect(resources.en['ext.example']).toMatchObject({
      nav: { ping: 'Extension ping' },
      slot: { dashboard: expect.stringContaining('dashboard') },
    })
    expect(resources.es['ext.example']).toMatchObject({
      nav: { ping: 'Ping de la extensión' },
      slot: { dashboard: expect.stringContaining('Panel') },
    })
  })
})
