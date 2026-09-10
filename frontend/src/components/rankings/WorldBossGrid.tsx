import { Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyWorld } from './EmptyWorld'
import { formatRespawn } from './rankingsFormat'
import { bossNames, type WorldRow } from './rankingsMeta'

export function WorldBossGrid({ rows }: { rows: WorldRow[] }) {
  const { t } = useTranslation('public')

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
            <span>{t('rankings.grandBoss')}</span>
            <strong>
              {bossNames[bossId] ?? t('rankings.format.bossFallback', { id: bossId || '—' })}
            </strong>
            <em className={respawn.live ? 'is-live' : 'is-down'}>{respawn.label}</em>
          </article>
        )
      })}
    </div>
  )
}
