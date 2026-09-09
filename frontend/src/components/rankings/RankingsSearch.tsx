import { Search } from 'lucide-react'
import { formatWorldCell, initial } from './rankingsFormat'
import type { WorldRow } from './rankingsMeta'

type RankingsSearchProps = {
  search: string
  onSearchChange: (value: string) => void
  isLoading: boolean
  results: WorldRow[]
}

export function RankingsSearch({ search, onSearchChange, isLoading, results }: RankingsSearchProps) {
  return (
    <section className="rankings-search" aria-label="Buscar personagem">
      <div className="rankings-heading">
        <span>
          <Search aria-hidden="true" />
        </span>
        <div>
          <small>Consulta</small>
          <h2>Buscar personagem</h2>
        </div>
      </div>
      <label className="rankings-search-field">
        <span className="sr-only">Nome do personagem</span>
        <Search aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Digite ao menos 2 letras..."
        />
      </label>
      {search.trim().length >= 2 ? (
        isLoading ? (
          <p className="rankings-search-hint">Procurando no mundo...</p>
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
                  <small>{String(row.clan_name ?? 'Sem clã')}</small>
                </span>
                <span className={`rankings-board-score ${Number(row.online) ? 'is-live' : 'is-down'}`}>
                  {Number(row.online) ? 'Online' : 'Offline'}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rankings-search-hint">Nenhum personagem encontrado com esse nome.</p>
        )
      ) : (
        <p className="rankings-search-hint">Use o nome do personagem para localizar clã, nível e status.</p>
      )}
    </section>
  )
}
