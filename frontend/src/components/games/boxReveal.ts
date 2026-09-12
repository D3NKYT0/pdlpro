/** O baú no card treme antes do overlay. */
export const BOX_SHAKE_MS = 900
/** Abertura grande no modal, depois que o overlay já está no centro. */
export const BOX_OVERLAY_MS = 2800
/** Tempo total até revelar o item, contado a partir do clique. */
export const BOX_REVEAL_MS = BOX_SHAKE_MS + BOX_OVERLAY_MS

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function waitForBoxShake(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, BOX_SHAKE_MS - (now - startedAt)))
}

export function waitForBoxReveal(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, BOX_REVEAL_MS - (now - startedAt)))
}

export function boxOpenPhase(elapsed: number): 'shake' | 'overlay' | 'done' {
  if (elapsed >= BOX_REVEAL_MS) return 'done'
  if (elapsed >= BOX_SHAKE_MS) return 'overlay'
  return 'shake'
}
