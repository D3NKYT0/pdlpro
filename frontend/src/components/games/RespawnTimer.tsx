import { formatRespawnClock, respawnRingProgress } from './respawnClock'

const RADIUS = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function RespawnTimer({
  remaining,
  total,
  label,
}: {
  remaining: number
  total: number
  label: string
}) {
  const progress = respawnRingProgress(remaining, total)
  return (
    <span className={`respawn-timer${remaining <= 10 ? ' is-urgent' : ''}`} role="timer" aria-label={label}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle className="respawn-timer-track" cx="20" cy="20" r={RADIUS} />
        <circle
          className="respawn-timer-fill"
          cx="20"
          cy="20"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <b>{formatRespawnClock(remaining)}</b>
    </span>
  )
}
