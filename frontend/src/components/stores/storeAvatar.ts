import { characterAvatarSrc } from '../character/characterPortrait'

export {
  CHARACTER_RACES as STORE_RACES,
  characterRace as storeRace,
  raceFromClass,
  type CharacterRace as StoreRace,
} from '../character/characterPortrait'

export function storeAvatarSrc(race?: string, sex?: number) {
  return characterAvatarSrc({ race, sex })
}
