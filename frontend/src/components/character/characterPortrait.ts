export const CHARACTER_RACES = ['human', 'elf', 'dark_elf', 'orc', 'dwarf'] as const

export type CharacterRace = (typeof CHARACTER_RACES)[number]

const AVATARS: Record<CharacterRace, { 0: string; 1: string }> = {
  human: { 0: '/theme/avatars/human-m.png', 1: '/theme/avatars/human-f.png' },
  elf: { 0: '/theme/avatars/elf-m.png', 1: '/theme/avatars/elf-f.png' },
  dark_elf: { 0: '/theme/avatars/dark-elf-m.png', 1: '/theme/avatars/dark-elf-f.png' },
  orc: { 0: '/theme/avatars/orc-m.png', 1: '/theme/avatars/orc-f.png' },
  dwarf: { 0: '/theme/avatars/dwarf-m.png', 1: '/theme/avatars/dwarf-f.png' },
}

export function characterRace(value: string | undefined): CharacterRace {
  return CHARACTER_RACES.includes(value as CharacterRace) ? (value as CharacterRace) : 'human'
}

/** Raça Interlude a partir do class_id (mesmas faixas do backend). */
export function raceFromClass(classId: number | undefined): CharacterRace {
  const cid = Number(classId || 0)
  if ((cid >= 0 && cid <= 17) || (cid >= 88 && cid <= 98)) return 'human'
  if ((cid >= 18 && cid <= 30) || (cid >= 99 && cid <= 105)) return 'elf'
  if ((cid >= 31 && cid <= 43) || (cid >= 106 && cid <= 112)) return 'dark_elf'
  if ((cid >= 44 && cid <= 52) || (cid >= 113 && cid <= 116)) return 'orc'
  if ((cid >= 53 && cid <= 57) || (cid >= 117 && cid <= 118)) return 'dwarf'
  return 'human'
}

export function characterAvatarSrc(options: {
  race?: string
  sex?: number
  classId?: number
}): string {
  const race = options.race ? characterRace(options.race) : raceFromClass(options.classId)
  const portraits = AVATARS[race]
  return options.sex === 1 ? portraits[1] : portraits[0]
}
