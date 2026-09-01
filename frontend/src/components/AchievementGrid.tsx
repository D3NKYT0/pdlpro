import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Lock, Trophy } from 'lucide-react'

export type AchievementRow = { code: string; name: string; description: string; unlocked: boolean }

const PAGE_SIZE = 12

export function AchievementGrid({
  achievements,
  rewardsTo = '/painel/progress',
  showRewardsLink = true,
}: {
  achievements: AchievementRow[]
  rewardsTo?: string
  showRewardsLink?: boolean
}) {
  const [page, setPage] = useState(1)
  const unlockedCount = achievements.filter((row) => row.unlocked).length
  const totalPages = Math.max(1, Math.ceil(achievements.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return achievements.slice(start, start + PAGE_SIZE)
  }, [achievements, currentPage])

  return (
    <section className="card conquista-section">
      <div className="conquista-heading">
        <div>
          <span className="panel-eyebrow">Marcos da conta</span>
          <h2>Conquistas</h2>
        </div>
        <div className="conquista-heading-actions">
          <b>{unlockedCount}/{achievements.length || 0}</b>
          {showRewardsLink ? (
            <Link className="btn" to={rewardsTo}>
              <Gift aria-hidden="true" /> Ver prêmios
            </Link>
          ) : null}
        </div>
      </div>

      {visible.length ? (
        <div className="conquista-grid">
          {visible.map((row) => (
            <article className={`conquista-card ${row.unlocked ? '' : 'locked'}`} key={row.code}>
              {row.unlocked ? <Trophy aria-hidden="true" /> : <Lock aria-hidden="true" />}
              <strong>{row.name}</strong>
              <small>{row.unlocked ? row.description : 'Conquista bloqueada'}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="progress-empty"><Trophy aria-hidden="true" /> Nenhuma conquista configurada.</div>
      )}

      {totalPages > 1 ? (
        <nav className="conquista-pagination" aria-label="Páginas de conquistas">
          <button type="button" className="btn ghost" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            Anterior
          </button>
          <span>{currentPage} / {totalPages}</span>
          <button type="button" className="btn ghost" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
            Próxima
          </button>
        </nav>
      ) : null}
    </section>
  )
}
