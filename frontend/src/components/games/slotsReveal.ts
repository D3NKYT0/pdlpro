/** Tempo do caça-níquel girar e parar os três cilindros em sequência. */
export const SLOTS_REVEAL_MS = 2200

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function waitForSlotsReveal(startedAt: number, now = Date.now()) {
  return wait(Math.max(0, SLOTS_REVEAL_MS - (now - startedAt)))
}
