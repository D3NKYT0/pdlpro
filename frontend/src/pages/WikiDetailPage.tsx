import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

export function WikiDetailPage() {
  const { slug = '' } = useParams()
  const page = useQuery({ queryKey: ['wiki-page', slug], queryFn: () => contentApi.wikiPage(slug), enabled: Boolean(slug) })

  return (
    <div className="public-page">
      <PublicHero kicker={page.data?.category || 'Guias'} title={page.data?.title ?? 'Wiki'} />
      <div className="container">
        <Link className="public-back" to="/wiki">
          ← Wiki
        </Link>
        {page.isLoading ? (
          <PublicEmpty>Carregando a página...</PublicEmpty>
        ) : page.data ? (
          <article className="public-prose">
            {page.data.summary ? <p className="public-lead">{page.data.summary}</p> : null}
            <div className="public-body">{page.data.body}</div>
          </article>
        ) : (
          <PublicEmpty>Esta página da wiki não foi encontrada.</PublicEmpty>
        )}
      </div>
    </div>
  )
}
