import { expect, it, vi } from 'vitest'
import { FIGHT_REVEAL_MS, fightPhase, waitForFightReveal } from './fightReveal'

it('segura o combate pelo tempo do palco', async () => {
  vi.useFakeTimers()
  const reveal = waitForFightReveal(0, 0)
  const done = vi.fn()
  void reveal.then(done)
  await vi.advanceTimersByTimeAsync(FIGHT_REVEAL_MS - 1)
  expect(done).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it('marca o confronto e o fim', () => {
  expect(fightPhase(0)).toBe('clash')
  expect(fightPhase(FIGHT_REVEAL_MS - 1)).toBe('clash')
  expect(fightPhase(FIGHT_REVEAL_MS)).toBe('done')
})
