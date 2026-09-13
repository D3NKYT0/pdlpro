/** Tempo do cubo 3D tombear até pousar na face sorteada. */
export const DICE_REVEAL_MS = 1100
/** Tempo da face escolhida de frente, antes de voltar ao repouso. */
export const DICE_CHOSEN_MS = 2800

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function waitForDiceReveal(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, DICE_REVEAL_MS - (now - startedAt)))
}

export function waitForDiceRest() {
  return wait(DICE_CHOSEN_MS)
}
