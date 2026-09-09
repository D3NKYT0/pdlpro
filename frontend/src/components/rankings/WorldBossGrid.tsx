import { Crown } from 'lucide-react'
import { EmptyWorld } from './EmptyWorld'
import { formatRespawn } from './rankingsFormat'
import { bossNames, type WorldRow } from './rankingsMeta'

export function WorldBossGrid({ rows }: { rows: WorldRow[] }) {
  if (!rows.length) return <EmptyWorld />

  return (
    <div className="rankings-world-grid">
      {rows.map((row) => {
        const bossId = String(row.boss_id ?? '')
        const respawn = formatRespawn(row.respawn)
        return (
          <article className="rankings-world-card" key={bossId || String(row.respawn)}>
            <div className="rankings-mark sm">
              <Crown aria-hidden="true" />
            </div>
            <span>Grand Boss</span>
            <strong>{bossNames[bossId] ?? `Boss #${bossId || '—'}`}</strong>
            <em className={respawn.live ? 'is-live' : 'is-down'}>{respawn.label}</em>
          </article>
        )
      })}
    </div>
  )
}
