import type { FishingBaitKind } from './GameVisuals'

/** A linha cai e a boia acomoda na água (isca comum). */
export const FISHING_CAST_MS = 1100
/** O peixe se aproxima e a boia afunda (isca comum). */
export const FISHING_BITE_MS = 900
/** O peixe aparece no centro e some (captura ou fuga). */
export const FISHING_REVEAL_MS = 1800
/** Tempo total do palco, da linha ao troféu (isca comum). */
export const FISHING_TOTAL_MS = FISHING_CAST_MS + FISHING_BITE_MS + FISHING_REVEAL_MS

const BAIT_STAGE: Record<FishingBaitKind, { cast: number; bite: number; reveal: number }> = {
  common: { cast: FISHING_CAST_MS, bite: FISHING_BITE_MS, reveal: FISHING_REVEAL_MS },
  apprentice: { cast: 980, bite: 780, reveal: 1800 },
  enchanted: { cast: 780, bite: 640, reveal: 1900 },
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** Durações do palco por tipo de isca: encantada cai mais rápido e brilha mais no revelar. */
export function fishingStageMs(kind: FishingBaitKind = 'common') {
  return BAIT_STAGE[kind] ?? BAIT_STAGE.common
}

export function fishingTotalMs(kind: FishingBaitKind = 'common') {
  const stage = fishingStageMs(kind)
  return stage.cast + stage.bite + stage.reveal
}

export function waitForFishingCast(
  startedAt: number,
  now = Date.now(),
  kind: FishingBaitKind = 'common',
) {
  return wait(Math.max(0, fishingStageMs(kind).cast - (now - startedAt)))
}

export function waitForFishingBite(
  startedAt: number,
  now = Date.now(),
  kind: FishingBaitKind = 'common',
) {
  const stage = fishingStageMs(kind)
  return wait(Math.max(0, stage.cast + stage.bite - (now - startedAt)))
}

export function waitForFishingReveal(
  startedAt: number,
  now = Date.now(),
  kind: FishingBaitKind = 'common',
) {
  return wait(Math.max(0, fishingTotalMs(kind) - (now - startedAt)))
}

export function fishingPhase(
  elapsed: number,
  kind: FishingBaitKind = 'common',
): 'cast' | 'bite' | 'reveal' | 'done' {
  const stage = fishingStageMs(kind)
  const total = stage.cast + stage.bite + stage.reveal
  if (elapsed >= total) return 'done'
  if (elapsed >= stage.cast + stage.bite) return 'reveal'
  if (elapsed >= stage.cast) return 'bite'
  return 'cast'
}
