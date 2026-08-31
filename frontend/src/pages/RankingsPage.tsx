import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { serverApi } from '../services/api'

const kinds = ['pvp', 'pk', 'level', 'online', 'clans', 'adena']

export function RankingsPage() {
  const [kind, setKind] = useState('pvp')
  const query = useQuery({ queryKey: ['rankings', kind], queryFn: () => serverApi.rankings(kind) })

  return (
    <section className="card">
      <h1>Rankings</h1>
      <p>
        {kinds.map((item) => (
          <button key={item} className={item === kind ? 'btn' : 'btn ghost'} type="button" onClick={() => setKind(item)}>
            {item.toUpperCase()}
          </button>
        ))}
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {(query.data ?? []).map((row) => (
            <tr key={`${row.position}-${row.name}`}>
              <td>{row.position}</td>
              <td>{row.name}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!query.data?.length && <p className="muted">Sem dados. Conecte o banco Lineage em LINEAGE_DB_ENABLED.</p>}
    </section>
  )
}
