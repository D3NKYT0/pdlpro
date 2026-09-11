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
