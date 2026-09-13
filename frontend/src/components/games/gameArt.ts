export type GameRarity = 'common' | 'rare' | 'epic' | 'legendary'

const RARITY_PATTERNS: Array<{ rarity: GameRarity; pattern: RegExp }> = [
  { rarity: 'legendary', pattern: /legend|lendar/i },
  { rarity: 'epic', pattern: /epic|epico/i },
  { rarity: 'rare', pattern: /rare|rar[ao]/i },
  { rarity: 'common', pattern: /common|comum/i },
]

const RARITY_ORDER: Record<GameRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
}

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

export function boxRarityRank(name: string, price?: string | number) {
  return RARITY_ORDER[inferBoxRarity(name, price)]
}

export function sortBoxesByRarity<T>(
  rows: T[],
  nameOf: (row: T) => string,
  priceOf?: (row: T) => string | number | undefined,
) {
  return [...rows].sort((left, right) => {
    const diff =
      boxRarityRank(nameOf(left), priceOf?.(left)) - boxRarityRank(nameOf(right), priceOf?.(right))
    if (diff !== 0) return diff
    return Number(priceOf?.(left) ?? 0) - Number(priceOf?.(right) ?? 0)
  })
}

export type FishRarity = GameRarity | 'divine'
export type FishArtId =
  | 'lambari'
  | 'tilapia'
  | 'traira'
  | 'dourado'
  | 'tucunare'
  | 'tambaqui'
  | 'piraiba'
  | 'surubim'
  | 'pirarucu'
  | 'koi'
  | 'boiuna'
  | 'serafim'

const FISH_NAME_ART: Array<{ pattern: RegExp; id: FishArtId }> = [
  { pattern: /serafim/i, id: 'serafim' },
  { pattern: /boiuna/i, id: 'boiuna' },
  { pattern: /\bkoi\b/i, id: 'koi' },
  { pattern: /pirarucu/i, id: 'pirarucu' },
  { pattern: /surubim/i, id: 'surubim' },
  { pattern: /piraiba/i, id: 'piraiba' },
  { pattern: /tambaqui/i, id: 'tambaqui' },
  { pattern: /tucunare/i, id: 'tucunare' },
  { pattern: /dourado/i, id: 'dourado' },
  { pattern: /traira/i, id: 'traira' },
  { pattern: /tilapia/i, id: 'tilapia' },
  { pattern: /lambari/i, id: 'lambari' },
]

const FISH_RARITY_ART: Record<FishRarity, FishArtId> = {
  common: 'lambari',
  rare: 'dourado',
  epic: 'piraiba',
  legendary: 'pirarucu',
  divine: 'serafim',
}

export function normalizeGameRarity(value?: string | null): GameRarity {
  const text = (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return RARITY_PATTERNS.find(({ pattern }) => pattern.test(text))?.rarity ?? 'common'
}

export function normalizeFishRarity(value?: string | null): FishRarity {
  const text = (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/divin/i.test(text)) return 'divine'
  return normalizeGameRarity(value)
}

export const FISH_RARITY_TIERS: FishRarity[] = ['common', 'rare', 'epic', 'legendary', 'divine']
const FISH_RARITY_LEFT: FishRarity[] = ['common', 'rare']
const FISH_RARITY_RIGHT: FishRarity[] = ['epic', 'legendary', 'divine']

export type FishRarityGroup<T> = { rarity: FishRarity; items: T[] }

/** Agrupa a coleção da comum à divina; omite faixas sem espécies. */
export function groupFishByRarity<T extends { rarity: string }>(rows: T[]): FishRarityGroup<T>[] {
  const buckets = new Map<FishRarity, T[]>(FISH_RARITY_TIERS.map((tier) => [tier, []]))
  for (const row of rows) {
    buckets.get(normalizeFishRarity(row.rarity))?.push(row)
  }
  return FISH_RARITY_TIERS.flatMap((rarity) => {
    const items = buckets.get(rarity) ?? []
    return items.length ? [{ rarity, items }] : []
  })
}

/** Parte as faixas em duas colunas: águas rasas e águas profundas. */
export function splitFishRarityColumns<T>(groups: FishRarityGroup<T>[]) {
  return {
    left: groups.filter((group) => FISH_RARITY_LEFT.includes(group.rarity)),
    right: groups.filter((group) => FISH_RARITY_RIGHT.includes(group.rarity)),
  }
}

/** Token CSS da sprite; o tema pode remapear `--theme-art-games-fish-*`. */
export function fishArtVar(id: FishArtId) {
  return `var(--theme-art-games-fish-${id})`
}

/** Escolhe a sprite pelo nome da espécie; espécies novas caem na raridade. */
export function resolveFishArt(name?: string | null, rarity?: string | null): FishArtId {
  const text = (name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const named = FISH_NAME_ART.find(({ pattern }) => pattern.test(text))
  if (named) return named.id
  return FISH_RARITY_ART[normalizeFishRarity(rarity ?? text)]
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

export type RouletteRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario'

export type RouletteReelPrize = {
  id: string
  name: string
  rarity: string
  quantity?: number
  item_id?: number
}

/** Normaliza raridade da API (pt/en) para o tambor da roleta. */
export function normalizeRouletteRarity(value: string): RouletteRarity {
  const key = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (key.startsWith('lend') || key.startsWith('legend')) return 'lendario'
  if (key.startsWith('epic')) return 'epico'
  if (key.startsWith('rar')) return 'raro'
  if (key.startsWith('incom') || key.startsWith('uncommon')) return 'incomum'
  return 'comum'
}

export function findRoulettePrizeIndex(
  prizes: Array<{ name: string; quantity?: number }>,
  prizeName?: string | null,
  prizeQuantity?: number,
) {
  if (!prizeName) return -1
  return prizes.findIndex(
    (prize) => prize.name === prizeName && (prize.quantity ?? 1) === (prizeQuantity ?? 1),
  )
}

/** Repete o catálogo para o tambor circular sem expor todos os itens ao mesmo tempo. */
export function rouletteReelStrip<T>(prizes: T[], copies?: number): T[] {
  if (!prizes.length) return []
  const times = copies ?? (prizes.length >= 8 ? 2 : 4)
  return Array.from({ length: times }, () => prizes).flat()
}
