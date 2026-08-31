import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { serverApi } from '../services/api'

const rankingKinds = ['pvp', 'pk', 'level', 'online', 'clans', 'adena']
const worldKinds = [
  { name: 'olympiad_ranking', label: 'Olimpíada' },
  { name: 'grandboss_status', label: 'Grand Boss' },
  { name: 'siege', label: 'Siege' },
]

type Tab = { type: 'ranking'; kind: string } | { type: 'world'; name: string }

export function RankingsPage() {
  const [tab, setTab] = useState<Tab>({ type: 'ranking', kind: 'pvp' })
  const [search, setSearch] = useState('')
  const rankings = useQuery({
    queryKey: ['rankings', tab],
    queryFn: () => serverApi.rankings(tab.type === 'ranking' ? tab.kind : 'pvp'),
    enabled: tab.type === 'ranking',
  })
  const world = useQuery({
    queryKey: ['world', tab],
    queryFn: () => serverApi.world(tab.type === 'world' ? tab.name : 'olympiad_ranking'),
    enabled: tab.type === 'world',
  })
  const characters = useQuery({
    queryKey: ['world-search', search],
    queryFn: () => serverApi.world('search_characters', { query: search }),
    enabled: search.trim().length >= 2,
  })

  const worldRows = world.data ?? []
  const worldKeys = worldRows[0] ? Object.keys(worldRows[0]) : []

  return (
    <section className="card">
      <h1>Rankings e mundo</h1>
      <p>
        {rankingKinds.map((item) => (
          <button
            key={item}
            className={tab.type === 'ranking' && tab.kind === item ? 'btn' : 'btn ghost'}
            type="button"
            onClick={() => setTab({ type: 'ranking', kind: item })}
          >
            {item.toUpperCase()}
          </button>
        ))}
        {worldKinds.map((item) => (
          <button
            key={item.name}
            className={tab.type === 'world' && tab.name === item.name ? 'btn' : 'btn ghost'}
            type="button"
            onClick={() => setTab({ type: 'world', name: item.name })}
          >
            {item.label}
          </button>
        ))}
      </p>
      {tab.type === 'ranking' ? (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {(rankings.data ?? []).map((row) => (
              <tr key={`${row.position}-${row.name}`}>
                <td>{row.position}</td>
                <td>{row.name}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="table">
          <thead>
            <tr>
              {worldKeys.map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {worldRows.map((row, index) => (
              <tr key={index}>
                {worldKeys.map((key) => (
                  <td key={key}>{String(row[key] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!rankings.data?.length && tab.type === 'ranking' ? (
        <p className="muted">Sem dados. Conecte o banco Lineage em LINEAGE_DB_ENABLED.</p>
      ) : null}
      {tab.type === 'world' && !worldRows.length ? (
        <p className="muted">Sem dados desta consulta no momento.</p>
      ) : null}
      <h2>Buscar personagem</h2>
      <label className="field">
        Nome
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="mínimo 2 letras" />
      </label>
      {(characters.data ?? []).map((row, index) => (
        <p key={index}>
          {Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' · ')}
        </p>
      ))}
    </section>
  )
}
