import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('panel')
  const { t: tCommon } = useTranslation('common')
  const [page, setPage] = useState(1)
  const unlockedCount = achievements.filter((row) => row.unlocked).length
  const totalPages = Math.max(1, Math.ceil(achievements.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return achievements.slice(start, start + PAGE_SIZE)
  }, [achievements, currentPage])

  return (
    <Card className="conquista-section">
      <div className="conquista-heading">
        <div>
          <span className="panel-eyebrow">{t('progress.achievements.eyebrow')}</span>
          <h2>{t('progress.achievements.title')}</h2>
        </div>
        <div className="conquista-heading-actions">
          <b>{unlockedCount}/{achievements.length || 0}</b>
          {showRewardsLink ? (
            <Link className="btn" to={rewardsTo}>
              <Gift aria-hidden="true" /> {t('progress.achievements.viewRewards')}
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
              <small>{row.unlocked ? row.description : t('progress.achievements.locked')}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="progress-empty"><Trophy aria-hidden="true" /> {t('progress.achievements.empty')}</div>
      )}

      {totalPages > 1 ? (
        <nav className="conquista-pagination" aria-label={t('progress.achievements.paginationAria')}>
          <Button type="button" className="ghost" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            {tCommon('previous')}
          </Button>
          <span>{t('progress.achievements.pageOf', { page: currentPage, total: totalPages })}</span>
          <Button type="button" className="ghost" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
            {tCommon('next')}
          </Button>
        </nav>
      ) : null}
    </Card>
  )
}
