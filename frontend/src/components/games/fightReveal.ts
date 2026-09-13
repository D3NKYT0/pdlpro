/** Troca de golpes no palco, antes de revelar o resultado. */
export const FIGHT_CLASH_MS = 2200
/** Brilho final depois que os lutadores param. */
export const FIGHT_SETTLE_MS = 500
/** Tempo total até o palco mostrar vitória ou derrota. */
export const FIGHT_REVEAL_MS = FIGHT_CLASH_MS + FIGHT_SETTLE_MS

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function waitForFightReveal(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, FIGHT_REVEAL_MS - (now - startedAt)))
}

export function fightPhase(elapsed: number): 'clash' | 'done' {
  if (elapsed >= FIGHT_REVEAL_MS) return 'done'
  return 'clash'
}
