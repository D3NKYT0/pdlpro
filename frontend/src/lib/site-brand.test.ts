import { describe, expect, it } from 'vitest'
import { DEFAULT_SITE_BRAND, DEFAULT_SITE_TAGLINE, resolveSiteBrand } from './site-brand'

describe('resolveSiteBrand', () => {
  it('usa nome e slogan do painel quando preenchidos', () => {
    expect(resolveSiteBrand({ name: 'Imperium', slogan: 'O Número Um', chronicle: 'Interlude' })).toEqual({
      name: 'Imperium',
      tagline: 'O Número Um',
    })
  })

  it('cai no fallback de marca e usa crônica quando não há slogan', () => {
    expect(resolveSiteBrand({ name: '', slogan: '  ', chronicle: 'High Five' })).toEqual({
      name: DEFAULT_SITE_BRAND,
      tagline: 'High Five',
    })
  })

  it('ignora slogan igual ao nome e cai na tagline padrão', () => {
    expect(resolveSiteBrand({ name: 'Valorem', slogan: 'valorem' })).toEqual({
      name: 'Valorem',
      tagline: DEFAULT_SITE_TAGLINE,
    })
  })

  it('usa PDL PRO e Lineage sem dados', () => {
    expect(resolveSiteBrand(undefined)).toEqual({
      name: DEFAULT_SITE_BRAND,
      tagline: DEFAULT_SITE_TAGLINE,
    })
  })
})
