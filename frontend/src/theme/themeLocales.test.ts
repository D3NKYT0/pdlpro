import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import {
  applyThemeLocales,
  deepMergeLocale,
  resetThemeLocaleStateForTests,
} from './themeLocales'

afterEach(() => {
  resetThemeLocaleStateForTests()
  vi.unstubAllGlobals()
  void applyThemeLocales({ id: 'default', locales: null })
})

describe('deepMergeLocale', () => {
  it('sobrescreve folhas e preserva chaves irmãs', () => {
    expect(
      deepMergeLocale(
        { login: { title: 'Entre no Reino', submit: 'Entrar' }, register: { title: 'Criar' } },
        { login: { title: 'Entre no Valorem' } },
      ),
    ).toEqual({
      login: { title: 'Entre no Valorem', submit: 'Entrar' },
      register: { title: 'Criar' },
    })
  })
})

describe('applyThemeLocales', () => {
  it('aplica overlays do tema e restaura o catálogo embutido ao voltar ao Classic', async () => {
    const original = i18n.t('login.title', { ns: 'auth' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/locales/pt.json')) {
          return {
            ok: true,
            json: async () => ({ auth: { login: { title: 'Entre no Valorem' } } }),
          }
        }
        return { ok: false, json: async () => ({}) }
      }),
    )

    await applyThemeLocales({
      id: 'valorem',
      locales: { pt: '/media/themes/valorem/locales/pt.json' },
    })
    expect(i18n.t('login.title', { ns: 'auth' })).toBe('Entre no Valorem')

    await applyThemeLocales({ id: 'default', locales: null })
    expect(i18n.t('login.title', { ns: 'auth' })).toBe(original)
  })

  it('ignora namespaces desconhecidos no JSON do tema', async () => {
    const original = i18n.t('login.title', { ns: 'auth' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          shop: { title: 'Loja' },
          auth: { login: { title: 'Acesso Valorem' } },
        }),
      })),
    )

    await applyThemeLocales({
      id: 'valorem',
      locales: { pt: '/media/themes/valorem/locales/pt.json' },
    })
    expect(i18n.t('login.title', { ns: 'auth' })).toBe('Acesso Valorem')
    expect(i18n.exists('title', { ns: 'shop' })).toBe(false)
    expect(original).toBeTruthy()
  })
})
