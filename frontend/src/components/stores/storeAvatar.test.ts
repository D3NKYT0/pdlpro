import { expect, it } from 'vitest'
import { storeAvatarSrc, storeRace } from './storeAvatar'

it('escolhe o retrato pela raça e pelo sexo', () => {
  expect(storeAvatarSrc('elf', 0)).toBe('/theme/avatars/elf-m.png')
  expect(storeAvatarSrc('dark_elf', 1)).toBe('/theme/avatars/dark-elf-f.png')
  expect(storeAvatarSrc('unknown', 0)).toBe('/theme/avatars/human-m.png')
  expect(storeRace('orc')).toBe('orc')
  expect(storeRace('kamael')).toBe('human')
})
