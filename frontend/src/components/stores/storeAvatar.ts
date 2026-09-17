export const STORE_RACES = ['human', 'elf', 'dark_elf', 'orc', 'dwarf'] as const

export type StoreRace = (typeof STORE_RACES)[number]

const AVATARS: Record<StoreRace, { 0: string; 1: string }> = {
  human: { 0: '/theme/avatars/human-m.png', 1: '/theme/avatars/human-f.png' },
  elf: { 0: '/theme/avatars/elf-m.png', 1: '/theme/avatars/elf-f.png' },
  dark_elf: { 0: '/theme/avatars/dark-elf-m.png', 1: '/theme/avatars/dark-elf-f.png' },
  orc: { 0: '/theme/avatars/orc-m.png', 1: '/theme/avatars/orc-f.png' },
  dwarf: { 0: '/theme/avatars/dwarf-m.png', 1: '/theme/avatars/dwarf-f.png' },
}

export function storeRace(value: string | undefined): StoreRace {
  return STORE_RACES.includes(value as StoreRace) ? (value as StoreRace) : 'human'
}

export function storeAvatarSrc(race: string | undefined, sex: number | undefined): string {
  const portraits = AVATARS[storeRace(race)]
  return sex === 1 ? portraits[1] : portraits[0]
}
