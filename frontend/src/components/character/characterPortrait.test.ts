import { expect, it } from 'vitest'
import { characterAvatarSrc, raceFromClass } from './characterPortrait'

it('escolhe o retrato pela raça, sexo e classe Interlude', () => {
  expect(characterAvatarSrc({ race: 'elf', sex: 0 })).toBe('/theme/avatars/elf-m.png')
  expect(characterAvatarSrc({ race: 'dark_elf', sex: 1 })).toBe('/theme/avatars/dark-elf-f.png')
  expect(characterAvatarSrc({ classId: 102, sex: 0 })).toBe('/theme/avatars/elf-m.png')
  expect(characterAvatarSrc({ classId: 110, sex: 1 })).toBe('/theme/avatars/dark-elf-mage-f.png')
  expect(characterAvatarSrc({ classId: 57, sex: 1 })).toBe('/theme/avatars/dwarf-f.png')
  expect(characterAvatarSrc({ race: 'unknown', sex: 0 })).toBe('/theme/avatars/human-m.png')
  expect(raceFromClass(88)).toBe('human')
  expect(raceFromClass(99)).toBe('elf')
  expect(raceFromClass(113)).toBe('orc')
})

it.each([
  [10, 'human'], [17, 'human'], [94, 'human'], [98, 'human'],
  [25, 'elf'], [30, 'elf'], [103, 'elf'], [105, 'elf'],
  [38, 'dark-elf'], [43, 'dark-elf'], [110, 'dark-elf'], [112, 'dark-elf'],
  [49, 'orc'], [52, 'orc'], [115, 'orc'], [116, 'orc'],
])('diferencia ambos os sexos da classe mágica %s', (classId, race) => {
  expect(characterAvatarSrc({ classId, sex: 0 })).toBe(`/theme/avatars/${race}-mage-m.png`)
  expect(characterAvatarSrc({ classId, sex: 1 })).toBe(`/theme/avatars/${race}-mage-f.png`)
})

it.each([0, 9, 18, 24, 31, 37, 44, 48, 53, 57, 88, 93, 99, 102, 106, 109, 113, 114, 117, 118])('preserva o retrato físico da classe %s', classId => {
  expect(characterAvatarSrc({ classId, sex: 0 })).not.toContain('-mage-')
  expect(characterAvatarSrc({ classId, sex: 1 })).not.toContain('-mage-')
})
