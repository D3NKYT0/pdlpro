import { expect, it, vi } from 'vitest'
import {
  FISHING_BITE_MS,
  FISHING_CAST_MS,
  FISHING_TOTAL_MS,
  fishingPhase,
  fishingStageMs,
  fishingTotalMs,
  waitForFishingBite,
  waitForFishingCast,
  waitForFishingReveal,
} from './fishingReveal'

it('segura o lançamento, a fisgada e o revelar pelo tempo do palco', async () => {
  vi.useFakeTimers()
  const cast = waitForFishingCast(0, 0)
  const castDone = vi.fn()
  void cast.then(castDone)
  await vi.advanceTimersByTimeAsync(FISHING_CAST_MS - 1)
  expect(castDone).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(castDone).toHaveBeenCalledTimes(1)

  const bite = waitForFishingBite(0, 0)
  const biteDone = vi.fn()
  void bite.then(biteDone)
  await vi.advanceTimersByTimeAsync(FISHING_CAST_MS + FISHING_BITE_MS - 1)
  expect(biteDone).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(biteDone).toHaveBeenCalledTimes(1)

  const reveal = waitForFishingReveal(0, 0)
  const revealDone = vi.fn()
  void reveal.then(revealDone)
  await vi.advanceTimersByTimeAsync(FISHING_TOTAL_MS - 1)
  expect(revealDone).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(revealDone).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it('marca a linha, a fisgada, o salto e o fim', () => {
  expect(fishingPhase(0)).toBe('cast')
  expect(fishingPhase(FISHING_CAST_MS - 1)).toBe('cast')
  expect(fishingPhase(FISHING_CAST_MS)).toBe('bite')
  expect(fishingPhase(FISHING_CAST_MS + FISHING_BITE_MS - 1)).toBe('bite')
  expect(fishingPhase(FISHING_CAST_MS + FISHING_BITE_MS)).toBe('reveal')
  expect(fishingPhase(FISHING_TOTAL_MS - 1)).toBe('reveal')
  expect(fishingPhase(FISHING_TOTAL_MS)).toBe('done')
})

it('acelera o palco com isca encantada', () => {
  expect(fishingStageMs('enchanted').cast).toBeLessThan(FISHING_CAST_MS)
  expect(fishingStageMs('enchanted').bite).toBeLessThan(FISHING_BITE_MS)
  expect(fishingTotalMs('enchanted')).toBeGreaterThan(fishingStageMs('enchanted').cast)
  expect(fishingPhase(fishingStageMs('enchanted').cast - 1, 'enchanted')).toBe('cast')
  expect(fishingPhase(fishingStageMs('enchanted').cast, 'enchanted')).toBe('bite')
})
