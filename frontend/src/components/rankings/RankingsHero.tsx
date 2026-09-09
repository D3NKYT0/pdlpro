import { Trophy, type LucideIcon } from 'lucide-react'
import type { ApiRankingEntry } from '../../services/types'
import { formatValue } from './rankingsFormat'
import type { Tab } from './rankingsMeta'

type RankingsHeroProps = {
  tab: Tab
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
  return (
    <header className="rankings-hero">
      <div className="rankings-hero-glow" aria-hidden="true" />
      <div className="container rankings-hero-inner">
        <div className="rankings-hero-copy">
          <span className="rankings-eyebrow">
            <Trophy aria-hidden="true" />
            Hall da fama
          </span>
          <h1>
            Os mais fortes do <em>reino</em>
          </h1>
          <p>PvP, riqueza, clãs e olimpíada — o quadro de honra de quem escreve a história no servidor.</p>
        </div>

        <aside className="rankings-hero-card" aria-label="Categoria atual">
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
                <dt>1º lugar</dt>
                <dd>{leader.name}</dd>
              </div>
              <div>
                <dt>{tab.valueLabel ?? 'Valor'}</dt>
                <dd>{formatValue(tab, leader.value)}</dd>
              </div>
            </dl>
          ) : (
            <dl className="rankings-hero-metrics">
              <div>
                <dt>Jogadores</dt>
                <dd>{playersOnline ?? '—'}</dd>
              </div>
              <div>
                <dt>Lista</dt>
                <dd>{isLoading ? '…' : rankingCount || worldCount || '—'}</dd>
              </div>
            </dl>
          )}
        </aside>
      </div>
    </header>
  )
}
