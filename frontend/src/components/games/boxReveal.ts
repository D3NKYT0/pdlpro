/** Tempo mínimo da abertura do baú, para o palco revelar o item sorteado. */
export const BOX_REVEAL_MS = 2400
/** Tempo em que o prêmio fica visível no baú antes de atualizar a lista. */
export const BOX_HOLD_MS = 1400

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function waitForBoxReveal(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, BOX_REVEAL_MS - (now - startedAt)))
}

export function waitForBoxHold() {
  return wait(BOX_HOLD_MS)
}
