import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ApiRankingEntry } from '../../services/types'
import { EmptyWorld } from './EmptyWorld'
import { RankingPodium } from './RankingPodium'
import type { LocalizedTab, WorldRow } from './rankingsMeta'
import { SiegeBoard } from './SiegeBoard'
import { WorldBossGrid } from './WorldBossGrid'
import { WorldTable } from './WorldTable'

type RankingsSectionProps = {
  tab: LocalizedTab
  Icon: LucideIcon
  isLoading: boolean
  isError: boolean
  rankingRows: ApiRankingEntry[]
  worldRows: WorldRow[]
}

export function RankingsSection({
  tab,
  Icon,
  isLoading,
  isError,
  rankingRows,
  worldRows,
}: RankingsSectionProps) {
  const { t } = useTranslation('public')

  return (
    <section className="rankings-section">
      <div className="rankings-heading">
        <span>
          <Icon aria-hidden="true" />
        </span>
        <div>
          <small>{tab.kicker}</small>
          <h2>{tab.label}</h2>
        </div>
        {tab.valueLabel ? (
          <em>{tab.valueLabel}</em>
        ) : tab.id === 'siege' && worldRows.length ? (
          <em>{t('rankings.fortresses', { count: worldRows.length })}</em>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rankings-empty">
          <span className="rankings-diamond" aria-hidden="true" />
          <p>{t('rankings.loading')}</p>
        </div>
      ) : isError ? (
        <div className="rankings-empty">
          <span className="rankings-diamond" aria-hidden="true" />
          <p>{t('rankings.error')}</p>
        </div>
      ) : rankingRows.length ? (
        <RankingPodium tab={tab} rows={rankingRows} />
      ) : tab.id === 'grandboss' ? (
        <WorldBossGrid rows={worldRows} />
      ) : tab.id === 'siege' ? (
        <SiegeBoard rows={worldRows} />
      ) : worldRows.length ? (
        <WorldTable rows={worldRows} />
      ) : (
        <EmptyWorld ranking={tab.type === 'ranking'} />
      )}
    </section>
  )
}
