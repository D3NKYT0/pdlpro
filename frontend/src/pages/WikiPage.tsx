import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

export function WikiPage() {
  const [query, setQuery] = useState('')
  const pages = useQuery({ queryKey: ['wiki', query], queryFn: () => contentApi.wiki(query || undefined) })

  return (
    <div className="public-page">
      <PublicHero
        kicker="Guias"
        title="Wiki"
        description="Comandos, classes e conteúdo do jogo. Rates e crônica ficam em Informações."
      />
      <div className="container">
        <input
          className="public-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar comandos, siege, classes..."
          aria-label="Buscar na wiki"
        />
        {pages.isLoading ? (
          <PublicEmpty>Consultando a wiki...</PublicEmpty>
        ) : (pages.data ?? []).length ? (
          <div className="public-rows">
            {(pages.data ?? []).map((page) => (
              <Link key={page.id} to={`/wiki/${page.slug}`}>
                {page.category ? <span className="public-kicker">{page.category}</span> : null}
                <h3>{page.title}</h3>
                <p>{page.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <PublicEmpty>
            Nenhuma página publicada.
            {query ? ' Tente outra busca.' : null} Para rates e crônica, veja{' '}
            <Link to="/informacoes">Informações</Link>.
          </PublicEmpty>
        )}
      </div>
    </div>
  )
}
