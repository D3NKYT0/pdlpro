import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { contentApi } from '../services/api'

export function WikiPage() {
  const [query, setQuery] = useState('')
  const pages = useQuery({ queryKey: ['wiki', query], queryFn: () => contentApi.wiki(query || undefined) })

  return (
    <section className="card">
      <h1>Wiki</h1>
      <label className="field">
        Buscar
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="comandos, siege..." />
      </label>
      {(pages.data ?? []).map((page) => (
        <article key={page.id}>
          <h3>
            <Link to={`/wiki/${page.slug}`}>{page.title}</Link>
          </h3>
          <p className="muted">
            {page.category} — {page.summary}
          </p>
        </article>
      ))}
      {!pages.data?.length && <p className="muted">Nenhuma página publicada. Cadastre no admin.</p>}
    </section>
  )
}
