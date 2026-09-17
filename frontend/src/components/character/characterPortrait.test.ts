import { expect, it } from 'vitest'
import { characterAvatarSrc, raceFromClass } from './characterPortrait'

it('escolhe o retrato pela raça, sexo e classe Interlude', () => {
  expect(characterAvatarSrc({ race: 'elf', sex: 0 })).toBe('/theme/avatars/elf-m.png')
  expect(characterAvatarSrc({ race: 'dark_elf', sex: 1 })).toBe('/theme/avatars/dark-elf-f.png')
  expect(characterAvatarSrc({ classId: 102, sex: 0 })).toBe('/theme/avatars/elf-m.png')
  expect(characterAvatarSrc({ classId: 110, sex: 1 })).toBe('/theme/avatars/dark-elf-f.png')
  expect(characterAvatarSrc({ classId: 57, sex: 1 })).toBe('/theme/avatars/dwarf-f.png')
  expect(characterAvatarSrc({ race: 'unknown', sex: 0 })).toBe('/theme/avatars/human-m.png')
  expect(raceFromClass(88)).toBe('human')
  expect(raceFromClass(99)).toBe('elf')
  expect(raceFromClass(113)).toBe('orc')
})
