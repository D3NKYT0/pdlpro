import { expect, it } from 'vitest'
import {
  formatRespawnClock,
  remainingSeconds,
  rememberRespawnTotal,
  respawnRingProgress,
} from './respawnClock'

it('conta o tempo restante a partir do snapshot da API', () => {
  expect(remainingSeconds(60, 1000, 1000)).toBe(60)
  expect(remainingSeconds(60, 1000, 16_000)).toBe(45)
  expect(remainingSeconds(10, 1000, 20_000)).toBe(0)
})

it('formata o relógio em mm:ss', () => {
  expect(formatRespawnClock(0)).toBe('00:00')
  expect(formatRespawnClock(9)).toBe('00:09')
  expect(formatRespawnClock(60)).toBe('01:00')
  expect(formatRespawnClock(125)).toBe('02:05')
})

it('preenche o anel do maior tempo visto enquanto a fera está fora', () => {
  expect(respawnRingProgress(30, 60)).toBe(0.5)
  expect(respawnRingProgress(0, 60)).toBe(0)
  expect(respawnRingProgress(10, 0)).toBe(0)
  expect(
    rememberRespawnTotal({}, [
      { id: 'orc', alive: false, respawn_in: 60 },
      { id: 'troll', alive: true, respawn_in: 0 },
    ]),
  ).toEqual({ orc: 60 })
  expect(
    rememberRespawnTotal({ orc: 60, troll: 20 }, [
      { id: 'orc', alive: false, respawn_in: 40 },
      { id: 'troll', alive: true, respawn_in: 0 },
    ]),
  ).toEqual({ orc: 60 })
})
