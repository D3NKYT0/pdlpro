import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contentApi } from '../services/api'

export function WikiPage() {
  const [query, setQuery] = useState('')
  const pages = useQuery({ queryKey: ['wiki', query], queryFn: () => contentApi.wiki(query || undefined) })

  return (
    <div className="wiki">
      <div className="w-content container">
        <div className="page-header">
          <h1 className="page-title">Wiki</h1>
          <p className="page-description">Informações, rates, bosses e guias do servidor.</p>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Buscar</h2>
          </div>
          <div className="card-body">
            <label className="field">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="comandos, siege..." />
            </label>
          </div>
        </div>
        {(pages.data ?? []).map((page) => (
          <article className="card" key={page.id}>
            <div className="card-header">
              <h3 className="card-title">
                <Link to={`/wiki/${page.slug}`}>{page.title}</Link>
              </h3>
            </div>
            <div className="card-body">
              <p className="card-text">
                {page.category} — {page.summary}
              </p>
            </div>
          </article>
        ))}
        {!pages.data?.length ? <p className="page-description">Nenhuma página publicada. Cadastre no admin.</p> : null}
      </div>
    </div>
  )
}
