import { Trophy, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ApiRankingEntry } from '../../services/types'
import { formatValue } from './rankingsFormat'
import type { LocalizedTab } from './rankingsMeta'

type RankingsHeroProps = {
  tab: LocalizedTab
  Icon: LucideIcon
  statusLabel: string
  statusClass: string
  leader?: ApiRankingEntry
  rankingCount: number
  worldCount: number
  playersOnline?: number | string
  isLoading: boolean
}

export function RankingsHero({
  tab,
  Icon,
  statusLabel,
  statusClass,
  leader,
  rankingCount,
  worldCount,
  playersOnline,
  isLoading,
}: RankingsHeroProps) {
  const { t } = useTranslation('public')

  return (
    <header className="rankings-hero">
      <div className="rankings-hero-glow" aria-hidden="true" />
      <div className="container rankings-hero-inner">
        <div className="rankings-hero-copy">
          <span className="rankings-eyebrow">
            <Trophy aria-hidden="true" />
            {t('rankings.eyebrow')}
          </span>
          <h1>
            {t('rankings.titleBefore')} <em>{t('rankings.titleEm')}</em>
          </h1>
          <p>{t('rankings.lead')}</p>
        </div>

        <aside className="rankings-hero-card" aria-label={t('rankings.categoryAria')}>
          <div className="rankings-mark">
            <Icon aria-hidden="true" />
          </div>
          <div className={`rankings-live ${statusClass}`}>
            <i aria-hidden="true" />
            {statusLabel}
          </div>
          <span>{tab.kicker}</span>
          <strong>{tab.label}</strong>
          <p>{tab.blurb}</p>
          {leader ? (
            <dl className="rankings-hero-metrics">
              <div>
                <dt>{t('rankings.firstPlace')}</dt>
                <dd>{leader.name}</dd>
              </div>
              <div>
                <dt>{tab.valueLabel ?? t('rankings.valueFallback')}</dt>
                <dd>{formatValue(tab, leader.value)}</dd>
              </div>
            </dl>
          ) : (
            <dl className="rankings-hero-metrics">
              <div>
                <dt>{t('rankings.players')}</dt>
                <dd>{playersOnline ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('rankings.list')}</dt>
                <dd>{isLoading ? '…' : rankingCount || worldCount || '—'}</dd>
              </div>
            </dl>
          )}
        </aside>
      </div>
    </header>
  )
}
