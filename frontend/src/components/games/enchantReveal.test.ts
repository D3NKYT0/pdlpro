import { expect, it, vi } from 'vitest'
import { ENCHANT_REVEAL_MS, enchantPhase, enchantRevealKind, isEnchantPeak, waitForEnchantReveal } from './enchantReveal'

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

it('distingue tentativa, vitória, pico e derrota', () => {
  expect(enchantRevealKind({ attempting: true, success: true, from: 3, level: 4 })).toBe('attempting')
  expect(enchantRevealKind({ attempting: false, success: true, from: 3, level: 4 })).toBe('win')
  expect(enchantRevealKind({ attempting: false, success: false, from: 3, level: 3 })).toBe('loss')
  expect(enchantRevealKind({ attempting: false, success: true, from: 9, level: 0 })).toBe('peak')
  expect(isEnchantPeak(true, false, 9, 0)).toBe(true)
  expect(isEnchantPeak(true, true, 9, 0)).toBe(false)
  expect(isEnchantPeak(true, false, 8, 9)).toBe(false)
})
