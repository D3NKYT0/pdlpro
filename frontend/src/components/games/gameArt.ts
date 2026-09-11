export type GameRarity = 'common' | 'rare' | 'epic' | 'legendary'

const RARITY_PATTERNS: Array<{ rarity: GameRarity; pattern: RegExp }> = [
  { rarity: 'legendary', pattern: /legend|lendar/i },
  { rarity: 'epic', pattern: /epic|epico/i },
  { rarity: 'rare', pattern: /rare|rar[ao]/i },
  { rarity: 'common', pattern: /common|comum/i },
]

/** Infere a arte do baú pelo nome editorial ou, na falta dele, pela faixa de preço. */
export function inferBoxRarity(name: string, price?: string | number): GameRarity {
  const text = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const named = RARITY_PATTERNS.find(({ pattern }) => pattern.test(text))
  if (named) return named.rarity
  const value = Number(price)
  if (!Number.isFinite(value)) return 'common'
  if (value >= 80) return 'legendary'
  if (value >= 40) return 'epic'
  if (value >= 15) return 'rare'
  return 'common'
}

/** Variação leve entre monstros a partir do id, sem arte extra. */
export function monsterHue(id: string) {
  let hue = 0
  for (let index = 0; index < id.length; index += 1) {
    hue = (hue + id.charCodeAt(index) * 17) % 360
  }
  return hue
}

export const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const

/** Pips 1–9 no grid 3×3 do dado (linha a linha). */
export const DICE_PIP_FACES: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

export const SLOT_SYMBOLS = ['sword', 'shield', 'crown', 'adena', 'scroll'] as const
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number]

export function isSlotSymbol(value: string): value is SlotSymbol {
  return (SLOT_SYMBOLS as readonly string[]).includes(value)
}

export function visibleSlotReels(reels?: string[], symbols: string[] = []): string[] {
  const source = reels?.length ? reels : symbols
  const fallback = source.length ? source : [...SLOT_SYMBOLS]
  return Array.from({ length: 3 }, (_, index) => fallback[index % fallback.length])
}
