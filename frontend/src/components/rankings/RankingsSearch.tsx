import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatWorldCell, initial } from './rankingsFormat'
import type { WorldRow } from './rankingsMeta'

type RankingsSearchProps = {
  search: string
  onSearchChange: (value: string) => void
  isLoading: boolean
  results: WorldRow[]
}

export function RankingsSearch({ search, onSearchChange, isLoading, results }: RankingsSearchProps) {
  const { t } = useTranslation('public')

  return (
    <section className="rankings-search" aria-label={t('rankings.search.aria')}>
      <div className="rankings-heading">
        <span>
          <Search aria-hidden="true" />
        </span>
        <div>
          <small>{t('rankings.search.kicker')}</small>
          <h2>{t('rankings.search.title')}</h2>
        </div>
      </div>
      <label className="rankings-search-field">
        <span className="sr-only">{t('rankings.search.nameSr')}</span>
        <Search aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('rankings.search.placeholder')}
        />
      </label>
      {search.trim().length >= 2 ? (
        isLoading ? (
          <p className="rankings-search-hint">{t('rankings.search.loading')}</p>
        ) : results.length ? (
          <ol className="rankings-board">
            {results.map((row, index) => (
              <li key={`${row.char_id ?? row.name}-${index}`}>
                <span className="rankings-board-rank">{formatWorldCell('value', row.value)}</span>
                <span className="rankings-crest sm" aria-hidden="true">
                  <span>{initial(String(row.name ?? '?'))}</span>
                </span>
                <span className="rankings-board-name">
                  {String(row.name ?? '—')}
                  <small>{String(row.clan_name ?? t('rankings.search.noClan'))}</small>
                </span>
                <span className={`rankings-board-score ${Number(row.online) ? 'is-live' : 'is-down'}`}>
                  {Number(row.online) ? t('rankings.status.online') : t('rankings.status.offline')}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rankings-search-hint">{t('rankings.search.empty')}</p>
        )
      ) : (
        <p className="rankings-search-hint">{t('rankings.search.hint')}</p>
      )}
    </section>
  )
}
