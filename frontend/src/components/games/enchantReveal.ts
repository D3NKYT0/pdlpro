/** Tempo da tentativa no modal, antes de revelar sucesso ou falha. */
export const ENCHANT_REVEAL_MS = 1800

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function waitForEnchantReveal(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, ENCHANT_REVEAL_MS - (now - startedAt)))
}

export function enchantPhase(elapsed: number): 'attempt' | 'done' {
  if (elapsed >= ENCHANT_REVEAL_MS) return 'done'
  return 'attempt'
}
