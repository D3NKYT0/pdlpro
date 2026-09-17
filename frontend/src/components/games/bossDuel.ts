/** Cinco golpes no duelo do chefe, com pausa entre cada clique. */
export const BOSS_STRIKE_MAX = 5
export const BOSS_HIT_COOLDOWN_MS = 1200
export const BOSS_DUEL_MS = 16_000

export type BossDuelTick = {
  beat: number
  open: boolean
  hits: number
  remaining: number
}

export function startBossDuel({
  onTick,
  onComplete,
  now = Date.now,
}: {
  onTick: (state: BossDuelTick) => void
  onComplete: (hits: number) => void
  now?: () => number
}) {
  const started = now()
  let hits = 0
  let lastHitAt = started - BOSS_HIT_COOLDOWN_MS
  let stopped = false

  const elapsedNow = () => now() - started

  const canStrike = () => {
    if (stopped || hits >= BOSS_STRIKE_MAX) return false
    const elapsed = elapsedNow()
    if (elapsed < 0 || elapsed >= BOSS_DUEL_MS) return false
    return now() - lastHitAt >= BOSS_HIT_COOLDOWN_MS
  }

  const snapshot = (): BossDuelTick => {
    const elapsed = elapsedNow()
    return {
      beat: Math.min(BOSS_STRIKE_MAX, hits + 1),
      open: canStrike(),
      hits,
      remaining: Math.max(0, BOSS_DUEL_MS - elapsed),
    }
  }

  const emit = () => {
    onTick(snapshot())
  }

  const finish = () => {
    if (stopped) return
    stopped = true
    globalThis.clearInterval(timer)
    onComplete(hits)
  }

  const strike = () => {
    if (!canStrike()) return false
    hits += 1
    lastHitAt = now()
    emit()
    if (hits >= BOSS_STRIKE_MAX) finish()
    return true
  }

  const timer = globalThis.setInterval(() => {
    if (stopped) return
    emit()
    if (elapsedNow() >= BOSS_DUEL_MS) finish()
  }, 40)
  emit()

  return {
    strike,
    stop() {
      stopped = true
      globalThis.clearInterval(timer)
    },
  }
}
