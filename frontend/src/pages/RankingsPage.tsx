import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { serverApi } from '../services/api'

const rankingKinds = ['pvp', 'pk', 'level', 'online', 'clans', 'adena']
const worldKinds = [
  { name: 'olympiad_ranking', label: 'Olimpíada' },
  { name: 'grandboss_status', label: 'Grand Boss' },
  { name: 'siege', label: 'Siege' },
]

type Tab = { type: 'ranking'; kind: string } | { type: 'world'; name: string }

function tabFromParam(param: string | null): Tab {
  if (param === 'olympiad') return { type: 'world', name: 'olympiad_ranking' }
  if (param && worldKinds.some((item) => item.name === param)) return { type: 'world', name: param }
  if (param && rankingKinds.includes(param)) return { type: 'ranking', kind: param }
  return { type: 'ranking', kind: 'pvp' }
}

export function RankingsPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(() => tabFromParam(tabParam))

  useEffect(() => {
    setTab(tabFromParam(tabParam))
  }, [tabParam])
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
    <div className="tops-container">
      <aside className="tops-nav-container">
        <div className="tops-nav-header">
          <h2>Rankings</h2>
        </div>
        <nav className="tops-nav-menu">
          <ul className="tops-nav-list">
            {rankingKinds.map((item) => (
              <li className="tops-nav-item" key={item}>
                <button
                  className={`tops-nav-link${tab.type === 'ranking' && tab.kind === item ? ' active' : ''}`}
                  type="button"
                  onClick={() => setTab({ type: 'ranking', kind: item })}
                >
                  <i className="fas fa-trophy" />
                  {item.toUpperCase()}
                </button>
              </li>
            ))}
            {worldKinds.map((item) => (
              <li className="tops-nav-item" key={item.name}>
                <button
                  className={`tops-nav-link${tab.type === 'world' && tab.name === item.name ? ' active' : ''}`}
                  type="button"
                  onClick={() => setTab({ type: 'world', name: item.name })}
                >
                  <i className="fas fa-globe" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="tops-content">
        <div className="content-wrapper">
          <div className="tops-header-section">
            <h1>{tab.type === 'ranking' ? tab.kind.toUpperCase() : worldKinds.find((item) => item.name === tab.name)?.label}</h1>
            <p className="lead">Rankings e consultas do mundo Lineage.</p>
          </div>
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
          {!rankings.data?.length && tab.type === 'ranking' ? <p className="lead">Sem dados. Conecte o banco Lineage em LINEAGE_DB_ENABLED.</p> : null}
          {tab.type === 'world' && !worldRows.length ? <p className="lead">Sem dados desta consulta no momento.</p> : null}
          <h2 className="card-title">Buscar personagem</h2>
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
        </div>
      </div>
    </div>
  )
}
