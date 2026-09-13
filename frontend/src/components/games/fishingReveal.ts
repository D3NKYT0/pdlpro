/** A linha cai e a boia acomoda na água. */
export const FISHING_CAST_MS = 1100
/** O peixe se aproxima e a boia afunda. */
export const FISHING_BITE_MS = 900
/** O peixe aparece no centro e some (captura ou fuga). */
export const FISHING_REVEAL_MS = 1800
/** Tempo total do palco, da linha ao troféu. */
export const FISHING_TOTAL_MS = FISHING_CAST_MS + FISHING_BITE_MS + FISHING_REVEAL_MS

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function waitForFishingCast(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, FISHING_CAST_MS - (now - startedAt)))
}

export function waitForFishingBite(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, FISHING_CAST_MS + FISHING_BITE_MS - (now - startedAt)))
}

export function waitForFishingReveal(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, FISHING_TOTAL_MS - (now - startedAt)))
}

export function fishingPhase(elapsed: number): 'cast' | 'bite' | 'reveal' | 'done' {
  if (elapsed >= FISHING_TOTAL_MS) return 'done'
  if (elapsed >= FISHING_CAST_MS + FISHING_BITE_MS) return 'reveal'
  if (elapsed >= FISHING_CAST_MS) return 'bite'
  return 'cast'
}
