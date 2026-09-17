import { expect, it, vi } from 'vitest'
import { BOSS_DUEL_MS, BOSS_HIT_COOLDOWN_MS, BOSS_STRIKE_MAX, startBossDuel } from './bossDuel'

it('aceita o primeiro golpe na hora', () => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  const done = vi.fn()
  const duel = startBossDuel({
    onTick: () => undefined,
    onComplete: done,
    now: Date.now,
  })
  expect(duel.strike()).toBe(true)
  expect(duel.strike()).toBe(false)
  duel.stop()
  vi.useRealTimers()
})

it('conta cinco golpes com pausa e encerra o duelo', () => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  const ticks: Array<{ open: boolean; hits: number }> = []
  const done = vi.fn()
  const duel = startBossDuel({
    onTick: (state) => ticks.push({ open: state.open, hits: state.hits }),
    onComplete: done,
    now: Date.now,
  })
  for (let hit = 0; hit < BOSS_STRIKE_MAX; hit += 1) {
    if (hit > 0) {
      vi.setSystemTime(hit * BOSS_HIT_COOLDOWN_MS)
      vi.advanceTimersByTime(40)
    }
    expect(duel.strike()).toBe(true)
  }
  expect(done).toHaveBeenCalledWith(5)
  expect(ticks.some((tick) => tick.hits === 5)).toBe(true)
  duel.stop()
  vi.useRealTimers()
})

it('envia os golpes feitos se o tempo acabar', () => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  const done = vi.fn()
  const duel = startBossDuel({
    onTick: () => undefined,
    onComplete: done,
    now: Date.now,
  })
  expect(duel.strike()).toBe(true)
  vi.setSystemTime(BOSS_DUEL_MS)
  vi.advanceTimersByTime(40)
  expect(done).toHaveBeenCalledWith(1)
  duel.stop()
  vi.useRealTimers()
})
