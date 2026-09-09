import { Crown } from 'lucide-react'
import type { ApiRankingEntry } from '../../services/types'
import { formatValue, initial } from './rankingsFormat'
import type { Tab } from './rankingsMeta'

export function RankingPodium({ tab, rows }: { tab: Tab; rows: ApiRankingEntry[] }) {
  const rest = rows.slice(3)

  return (
    <>
      <div className={`rankings-podium${rows.length < 3 ? ' is-short' : ''}`}>
        {rows.slice(0, 3).map((row, index) => (
          <article className={`rankings-card place-${index + 1}`} key={`${row.position}-${row.name}`}>
            <div className="rankings-card-inner">
              <span className="rankings-place">
                {index === 0 ? <Crown aria-hidden="true" /> : null}
                {row.position}º
              </span>
              <span className="rankings-crest" aria-hidden="true">
                <span>{initial(row.name)}</span>
              </span>
              <h3>{row.name}</h3>
              <strong>{formatValue(tab, row.value)}</strong>
              <em>{tab.valueLabel}</em>
            </div>
          </article>
        ))}
      </div>
      {rest.length ? (
        <ol className="rankings-board">
          {rest.map((row) => (
            <li key={`${row.position}-${row.name}`}>
              <span className="rankings-board-rank">{row.position}</span>
              <span className="rankings-crest sm" aria-hidden="true">
                <span>{initial(row.name)}</span>
              </span>
              <span className="rankings-board-name">{row.name}</span>
              <span className="rankings-board-score">{formatValue(tab, row.value)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </>
  )
}
