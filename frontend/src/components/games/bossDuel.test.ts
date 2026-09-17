import { expect, it, vi } from 'vitest'
import {
  BOSS_BEAT_MS,
  BOSS_DUEL_MS,
  BOSS_WINDOW_MS,
  currentBeat,
  isStrikeOpen,
  startBossDuel,
} from './bossDuel'

it('abre a janela no meio de cada tempo', () => {
  expect(isStrikeOpen(-1)).toBe(false)
  expect(isStrikeOpen(0)).toBe(false)
  expect(isStrikeOpen((BOSS_BEAT_MS - BOSS_WINDOW_MS) / 2)).toBe(true)
  expect(isStrikeOpen(BOSS_BEAT_MS - 1)).toBe(false)
  expect(isStrikeOpen(BOSS_DUEL_MS)).toBe(false)
  expect(currentBeat(0)).toBe(0)
  expect(currentBeat(BOSS_BEAT_MS)).toBe(1)
})

it('conta um golpe por tempo e encerra o duelo', () => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  const ticks: Array<{ open: boolean; hits: number }> = []
  const done = vi.fn()
  const duel = startBossDuel({
    onTick: (state) => ticks.push({ open: state.open, hits: state.hits }),
    onComplete: done,
    now: Date.now,
  })
  expect(duel.strike()).toBe(false)
  vi.setSystemTime((BOSS_BEAT_MS - BOSS_WINDOW_MS) / 2)
  expect(duel.strike()).toBe(true)
  expect(duel.strike()).toBe(false)
  vi.setSystemTime(BOSS_BEAT_MS + (BOSS_BEAT_MS - BOSS_WINDOW_MS) / 2)
  expect(duel.strike()).toBe(true)
  vi.setSystemTime(BOSS_DUEL_MS)
  vi.advanceTimersByTime(40)
  expect(done).toHaveBeenCalledWith(2)
  expect(ticks.some((tick) => tick.open)).toBe(true)
  duel.stop()
  vi.useRealTimers()
})
