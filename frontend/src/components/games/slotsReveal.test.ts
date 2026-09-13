import { expect, it, vi } from 'vitest'
import { SLOTS_REVEAL_MS, waitForSlotsReveal } from './slotsReveal'

it('segura o revelar dos cilindros pelo tempo do palco', async () => {
  vi.useFakeTimers()
  const pending = waitForSlotsReveal(0, 0)
  const done = vi.fn()
  void pending.then(done)
  await vi.advanceTimersByTimeAsync(SLOTS_REVEAL_MS - 1)
  expect(done).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})
