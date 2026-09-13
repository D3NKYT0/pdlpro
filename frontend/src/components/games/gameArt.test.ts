import { describe, expect, it, vi } from 'vitest'
import {
  findRoulettePrizeIndex,
  inferBoxRarity,
  sortBoxesByRarity,
  monsterHue,
  normalizeGameRarity,
  normalizeRouletteRarity,
  groupFishByRarity,
  splitFishRarityColumns,
  resolveFishArt,
  rouletteReelStrip,
  visibleSlotReels,
} from './gameArt'
import { BOX_REVEAL_MS, BOX_SHAKE_MS, boxOpenPhase, waitForBoxReveal, waitForBoxShake } from './boxReveal'
import { ROULETTE_REVEAL_MS, ROULETTE_SLOW_MS, rouletteSpinPhase, waitForRouletteReveal } from './rouletteReveal'

describe('inferBoxRarity', () => {
  it('lê a raridade no nome editorial, com ou sem acento', () => {
    expect(inferBoxRarity('Caixa rara')).toBe('rare')
    expect(inferBoxRarity('Baú Épico')).toBe('epic')
    expect(inferBoxRarity('Legendary crate')).toBe('legendary')
    expect(inferBoxRarity('Comum')).toBe('common')
  })

  it('usa o preço quando o nome não declara raridade', () => {
    expect(inferBoxRarity('Baú do reino', '12')).toBe('common')
    expect(inferBoxRarity('Baú do reino', '20')).toBe('rare')
    expect(inferBoxRarity('Baú do reino', '40')).toBe('epic')
    expect(inferBoxRarity('Baú do reino', '80')).toBe('legendary')
  })

  it('ordena baús da raridade menor para a maior', () => {
    expect(
      sortBoxesByRarity(
        [
          { name: 'Baú Lendário', price: '100.00' },
          { name: 'Baú Comum', price: '10.00' },
          { name: 'Baú Épico', price: '50.00' },
          { name: 'Baú Raro', price: '25.00' },
        ],
        (row) => row.name,
        (row) => row.price,
      ).map((row) => row.name),
    ).toEqual(['Baú Comum', 'Baú Raro', 'Baú Épico', 'Baú Lendário'])
  })
})

it('escolhe a sprite do peixe pelo nome da espécie ou pela raridade', () => {
  expect(resolveFishArt('Lambari', 'common')).toBe('lambari')
  expect(resolveFishArt('Tilápia', 'common')).toBe('tilapia')
  expect(resolveFishArt('Tucunaré', 'rare')).toBe('tucunare')
  expect(resolveFishArt('Piraíba do rio', 'epic')).toBe('piraiba')
  expect(resolveFishArt('Koi Etéreo', 'legendary')).toBe('koi')
  expect(resolveFishArt('Boiúna', 'divine')).toBe('boiuna')
  expect(resolveFishArt('Serafim de Eva', 'divine')).toBe('serafim')
  expect(resolveFishArt('Seraph of Eva', 'divine')).toBe('serafim')
  expect(resolveFishArt('Serafín de Eva', 'divine')).toBe('serafim')
  expect(resolveFishArt('Pirarucu Ancestral', 'legendary')).toBe('pirarucu')
  expect(resolveFishArt('Truta', 'rare')).toBe('dourado')
  expect(resolveFishArt('Carpa', 'épico')).toBe('piraiba')
  expect(resolveFishArt('Relíquia', 'divino')).toBe('serafim')
  expect(normalizeGameRarity('lendario')).toBe('legendary')
})

it('agrupa a coleção por raridade e omite faixas vazias', () => {
  expect(
    groupFishByRarity([
      { name: 'Serafim de Eva', rarity: 'divine' },
      { name: 'Lambari', rarity: 'common' },
      { name: 'Tilápia', rarity: 'comum' },
      { name: 'Dourado', rarity: 'rare' },
    ]).map((tier) => [tier.rarity, tier.items.map((row) => row.name)]),
  ).toEqual([
    ['common', ['Lambari', 'Tilápia']],
    ['rare', ['Dourado']],
    ['divine', ['Serafim de Eva']],
  ])
})

it('parte as faixas em duas colunas: rasas e profundas', () => {
  const columns = splitFishRarityColumns(
    groupFishByRarity([
      { name: 'Serafim de Eva', rarity: 'divine' },
      { name: 'Lambari', rarity: 'common' },
      { name: 'Piraíba', rarity: 'epic' },
      { name: 'Dourado', rarity: 'rare' },
      { name: 'Pirarucu Ancestral', rarity: 'legendary' },
    ]),
  )
  expect(columns.left.map((tier) => tier.rarity)).toEqual(['common', 'rare'])
  expect(columns.right.map((tier) => tier.rarity)).toEqual(['epic', 'legendary', 'divine'])
})

it('varia o tom do monstro a partir do id', () => {
  expect(monsterHue('orc')).not.toBe(monsterHue('troll'))
  expect(monsterHue('orc')).toBe(monsterHue('orc'))
})

it('monta três cilindros visíveis a partir do catálogo', () => {
  expect(visibleSlotReels(undefined, ['sword', 'shield', 'crown', 'adena'])).toEqual(['sword', 'shield', 'crown'])
  expect(visibleSlotReels(['adena', 'scroll', 'sword'])).toEqual(['adena', 'scroll', 'sword'])
  expect(visibleSlotReels()).toHaveLength(3)
})

it('normaliza raridade da roleta e localiza o prêmio empilhado', () => {
  expect(normalizeRouletteRarity('comum')).toBe('comum')
  expect(normalizeRouletteRarity('uncommon')).toBe('incomum')
  expect(normalizeRouletteRarity('Épico')).toBe('epico')
  expect(normalizeRouletteRarity('legendary')).toBe('lendario')
  expect(
    findRoulettePrizeIndex(
      [
        { name: 'Adena', quantity: 50000 },
        { name: 'Adena', quantity: 200000 },
      ],
      'Adena',
      200000,
    ),
  ).toBe(1)
})

it('repete o catálogo no tambor sem exigir ver todos os itens de uma vez', () => {
  expect(rouletteReelStrip(['a', 'b'], 2)).toEqual(['a', 'b', 'a', 'b'])
  expect(rouletteReelStrip(['x'])).toHaveLength(4)
  expect(rouletteReelStrip([])).toEqual([])
})

it('segura o revelar do baú pelo tempo do palco', async () => {
  vi.useFakeTimers()
  const shake = waitForBoxShake(0, 0)
  const shaken = vi.fn()
  void shake.then(shaken)
  await vi.advanceTimersByTimeAsync(BOX_SHAKE_MS - 1)
  expect(shaken).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(shaken).toHaveBeenCalledTimes(1)
  const pending = waitForBoxReveal(0, 0)
  const done = vi.fn()
  void pending.then(done)
  await vi.advanceTimersByTimeAsync(BOX_REVEAL_MS - 1)
  expect(done).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it('marca o tremor do card, o overlay e o fim da abertura', () => {
  expect(boxOpenPhase(0)).toBe('shake')
  expect(boxOpenPhase(BOX_SHAKE_MS - 1)).toBe('shake')
  expect(boxOpenPhase(BOX_SHAKE_MS)).toBe('overlay')
  expect(boxOpenPhase(BOX_REVEAL_MS - 1)).toBe('overlay')
  expect(boxOpenPhase(BOX_REVEAL_MS)).toBe('done')
})

it('segura o revelar do giro pelo tempo do palco', async () => {
  vi.useFakeTimers()
  const pending = waitForRouletteReveal(0, 0)
  const done = vi.fn()
  void pending.then(done)
  await vi.advanceTimersByTimeAsync(ROULETTE_REVEAL_MS - 1)
  expect(done).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it('marca o giro rápido, a desaceleração e o fim', () => {
  expect(rouletteSpinPhase(0)).toBe('fast')
  expect(rouletteSpinPhase(ROULETTE_SLOW_MS - 1)).toBe('fast')
  expect(rouletteSpinPhase(ROULETTE_SLOW_MS)).toBe('slow')
  expect(rouletteSpinPhase(ROULETTE_REVEAL_MS - 1)).toBe('slow')
  expect(rouletteSpinPhase(ROULETTE_REVEAL_MS)).toBe('done')
})
