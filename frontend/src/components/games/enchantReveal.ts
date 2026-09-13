/** Tempo da tentativa no modal, antes de revelar sucesso ou falha. */
export const ENCHANT_REVEAL_MS = 1800

export type EnchantRevealKind = 'attempting' | 'win' | 'peak' | 'loss'

/** Pico: sucesso em +9 que entrega o prêmio e zera a arma. */
export function isEnchantPeak(success: boolean, attempting: boolean, from: number, level: number) {
  return success && !attempting && from >= 9 && level === 0
}

export function enchantRevealKind({
  attempting,
  success,
  from,
  level,
}: {
  attempting: boolean
  success: boolean
  from: number
  level: number
}): EnchantRevealKind {
  if (attempting) return 'attempting'
  if (isEnchantPeak(success, attempting, from, level)) return 'peak'
  return success ? 'win' : 'loss'
}

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
