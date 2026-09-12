/** Tempo mínimo do giro na Roda da Fortuna, para o palco revelar o resultado. */
export const ROULETTE_REVEAL_MS = 5000
/** Depois deste ponto o tambor desacelera até a revelação. */
export const ROULETTE_SLOW_MS = 2800

export function waitForRouletteReveal(startedAt: number, now = Date.now()) {
  const wait = Math.max(0, ROULETTE_REVEAL_MS - (now - startedAt))
  return new Promise<void>((resolve) => {
    setTimeout(resolve, wait)
  })
}

export function rouletteSpinPhase(elapsed: number): 'fast' | 'slow' | 'done' {
  if (elapsed >= ROULETTE_REVEAL_MS) return 'done'
  if (elapsed >= ROULETTE_SLOW_MS) return 'slow'
  return 'fast'
}
