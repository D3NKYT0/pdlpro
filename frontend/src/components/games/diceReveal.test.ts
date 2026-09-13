import { expect, it, vi } from 'vitest'
import { DICE_CHOSEN_MS, DICE_REVEAL_MS, waitForDiceRest, waitForDiceReveal } from './diceReveal'

it('segura o pouso do dado pelo tempo do cubo 3d', async () => {
  vi.useFakeTimers()
  const pending = waitForDiceReveal(0, 0)
  const done = vi.fn()
  void pending.then(done)
  await vi.advanceTimersByTimeAsync(DICE_REVEAL_MS - 1)
  expect(done).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it('segura o brilho da face escolhida antes do repouso', async () => {
  vi.useFakeTimers()
  const pending = waitForDiceRest()
  const done = vi.fn()
  void pending.then(done)
  await vi.advanceTimersByTimeAsync(DICE_CHOSEN_MS - 1)
  expect(done).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})
