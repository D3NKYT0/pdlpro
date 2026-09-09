import type { LucideIcon } from 'lucide-react'
import type { ApiRankingEntry } from '../../services/types'
import { EmptyWorld } from './EmptyWorld'
import { RankingPodium } from './RankingPodium'
import type { Tab, WorldRow } from './rankingsMeta'
import { SiegeBoard } from './SiegeBoard'
import { WorldBossGrid } from './WorldBossGrid'
import { WorldTable } from './WorldTable'

type RankingsSectionProps = {
  tab: Tab
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
          <em>{worldRows.length} fortalezas</em>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rankings-empty">
          <span className="rankings-diamond" aria-hidden="true" />
          <p>Consultando o hall da fama...</p>
        </div>
      ) : isError ? (
        <div className="rankings-empty">
          <span className="rankings-diamond" aria-hidden="true" />
          <p>Não foi possível carregar este ranking agora.</p>
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
