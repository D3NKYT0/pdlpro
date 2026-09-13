import { useEffect, useState } from 'react'

export function remainingSeconds(respawnIn: number, updatedAt: number, now = Date.now()) {
  return Math.max(0, respawnIn - Math.floor((now - updatedAt) / 1000))
}

export function formatRespawnClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function respawnRingProgress(remaining: number, total: number) {
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, remaining / total))
}

export function rememberRespawnTotal(
  totals: Record<string, number>,
  monsters: Array<{ id: string; alive: boolean; respawn_in: number }>,
) {
  const next = { ...totals }
  for (const monster of monsters) {
    if (monster.alive) {
      delete next[monster.id]
      continue
    }
    next[monster.id] = Math.max(next[monster.id] ?? 0, monster.respawn_in)
  }
  return next
}

export function useRespawnNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}
