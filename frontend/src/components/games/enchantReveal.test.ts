import { expect, it, vi } from 'vitest'
import { ENCHANT_REVEAL_MS, enchantPhase, waitForEnchantReveal } from './enchantReveal'

it('segura a tentativa pelo tempo do modal', async () => {
  vi.useFakeTimers()
  const reveal = waitForEnchantReveal(0, 0)
  const done = vi.fn()
  void reveal.then(done)
  await vi.advanceTimersByTimeAsync(ENCHANT_REVEAL_MS - 1)
  expect(done).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it('marca a tentativa e o fim', () => {
  expect(enchantPhase(0)).toBe('attempt')
  expect(enchantPhase(ENCHANT_REVEAL_MS - 1)).toBe('attempt')
  expect(enchantPhase(ENCHANT_REVEAL_MS)).toBe('done')
})
