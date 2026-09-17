/** Golpes cronometrados no duelo do chefe, antes de enviar o combate. */
export const BOSS_STRIKE_MAX = 5
export const BOSS_BEAT_MS = 780
export const BOSS_WINDOW_MS = 300
export const BOSS_DUEL_MS = BOSS_STRIKE_MAX * BOSS_BEAT_MS

export type BossDuelTick = {
  beat: number
  open: boolean
  hits: number
  remaining: number
}

export function isStrikeOpen(elapsed: number) {
  if (elapsed < 0 || elapsed >= BOSS_DUEL_MS) return false
  const inBeat = elapsed % BOSS_BEAT_MS
  const start = (BOSS_BEAT_MS - BOSS_WINDOW_MS) / 2
  return inBeat >= start && inBeat < start + BOSS_WINDOW_MS
}

export function currentBeat(elapsed: number) {
  if (elapsed < 0) return 0
  return Math.min(BOSS_STRIKE_MAX - 1, Math.floor(elapsed / BOSS_BEAT_MS))
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
  const hitBeats = new Set<number>()
  let stopped = false

  const snapshot = (): BossDuelTick => {
    const elapsed = now() - started
    return {
      beat: Math.min(BOSS_STRIKE_MAX, Math.floor(elapsed / BOSS_BEAT_MS) + 1),
      open: isStrikeOpen(elapsed),
      hits: hitBeats.size,
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
    onComplete(hitBeats.size)
  }

  const strike = () => {
    if (stopped) return false
    const elapsed = now() - started
    if (!isStrikeOpen(elapsed)) return false
    const beat = currentBeat(elapsed)
    if (hitBeats.has(beat)) return false
    hitBeats.add(beat)
    emit()
    return true
  }

  const timer = globalThis.setInterval(() => {
    if (stopped) return
    emit()
    if (now() - started >= BOSS_DUEL_MS) finish()
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
