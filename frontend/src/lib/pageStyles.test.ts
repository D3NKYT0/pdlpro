import { describe, expect, it } from 'vitest'
import type { ApiTheme } from '../services/api'
import { comingSoonMemoriesStyle, comingSoonMusic, guideRates, infoGuideStyle, resolveInfoGuideHash } from './pageStyles'

const categories = [
  { id: 'general', icon: 'compass' as const, items: ['fairPlay'], aliases: ['geral'] },
  { id: 'combat', icon: 'swords' as const, items: ['pvpZones'], aliases: ['pvp'] },
  { id: 'enchant', icon: 'shield' as const, items: ['safe'] },
]

function theme(pages: unknown) {
  return { pages } as Pick<ApiTheme, 'pages'>
}

describe('infoGuideStyle', () => {
  it('só ativa o guia quando o tema declara style guide com categorias', () => {
    expect(infoGuideStyle(null)).toBeNull()
    expect(infoGuideStyle(theme(null))).toBeNull()
    expect(infoGuideStyle(theme({ info: { style: 'classic', categories } }))).toBeNull()
    expect(infoGuideStyle(theme({ info: { style: 'guide', categories: [] } }))).toBeNull()
    expect(infoGuideStyle(theme({ info: { style: 'guide', categories, heroImage: 'images/info/hero.webp' } }))).toEqual({
      categories,
      heroImage: 'images/info/hero.webp',
    })
  })

  it('ignora categorias sem linhas', () => {
    const style = infoGuideStyle(theme({ info: { style: 'guide', categories: [...categories, { id: 'empty', icon: 'book', items: [] }] } }))
    expect(style?.categories.map((item) => item.id)).toEqual(['general', 'combat', 'enchant'])
    expect(style?.heroImage).toBeNull()
  })
})

describe('comingSoonMemoriesStyle', () => {
  it('só ativa memories com cenas válidas', () => {
    expect(comingSoonMemoriesStyle(theme({ comingSoon: { style: 'classic' } }))).toBeNull()
    expect(comingSoonMemoriesStyle(theme({ comingSoon: { style: 'memories', scenes: [] } }))).toBeNull()
    expect(
      comingSoonMemoriesStyle(theme({ comingSoon: { style: 'memories', timeZone: 'America/Sao_Paulo', scenes: [{ id: 'a', asset: 'images/a.webp' }, { id: 'b', asset: '' }] } })),
    ).toEqual({ scenes: [{ id: 'a', asset: 'images/a.webp' }], timeZone: 'America/Sao_Paulo', background: null })
  })
})

describe('resolveInfoGuideHash', () => {
  it('mantém os links antigos da /info', () => {
    expect(resolveInfoGuideHash('', categories)).toEqual({ category: null, anchor: null })
    expect(resolveInfoGuideHash('#geral', categories)).toEqual({ category: 'general', anchor: 'guide-content' })
    expect(resolveInfoGuideHash('#pvp', categories)).toEqual({ category: 'combat', anchor: 'guide-content' })
    expect(resolveInfoGuideHash('#enchant', categories)).toEqual({ category: 'enchant', anchor: 'guide-content' })
    expect(resolveInfoGuideHash('#features', categories)).toEqual({ category: 'general', anchor: 'features' })
    expect(resolveInfoGuideHash('#rates', categories)).toEqual({ category: null, anchor: 'rates' })
    expect(resolveInfoGuideHash('#comecar', categories)).toEqual({ category: null, anchor: 'comecar' })
  })

  it('ignora hashes desconhecidos ou malformados sem quebrar', () => {
    expect(resolveInfoGuideHash('#nada', categories)).toEqual({ category: null, anchor: null })
    expect(resolveInfoGuideHash('#%E0%A4%A', categories)).toEqual({ category: null, anchor: null })
  })
})

describe('guideRates', () => {
  it('junta EXP e SP quando iguais e omite valores vazios', () => {
    expect(guideRates({ xp: 'x20', sp: 'x20', adena: 'x5', drop: 'x1', spoil: 'x1' })).toEqual([
      { id: 'xpSp', value: 'x20' },
      { id: 'adena', value: 'x5' },
      { id: 'drop', value: 'x1' },
      { id: 'spoil', value: 'x1' },
    ])
  })

  it('separa EXP e SP quando diferentes', () => {
    expect(guideRates({ xp: 'x20', sp: 'x10', drop: '' })).toEqual([
      { id: 'xp', value: 'x20' },
      { id: 'sp', value: 'x10' },
    ])
    expect(guideRates(undefined)).toEqual([])
  })
})

describe('comingSoonMusic', () => {
  it('lê a trilha em qualquer estilo da Coming Soon', () => {
    expect(comingSoonMusic(theme(null))).toBeNull()
    expect(comingSoonMusic(theme({ comingSoon: { style: 'classic', music: 'audio/dion.mp3' } }))).toBe('audio/dion.mp3')
    expect(comingSoonMusic(theme({ comingSoon: { style: 'memories', scenes: [] } }))).toBeNull()
  })
})
