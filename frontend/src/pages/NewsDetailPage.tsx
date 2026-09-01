import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

export function NewsDetailPage() {
  const { slug = '' } = useParams()
  const news = useQuery({ queryKey: ['news', slug], queryFn: () => contentApi.newsDetail(slug), enabled: Boolean(slug) })

  return (
    <div className="public-page">
      <PublicHero
        kicker="Comunidade"
        title={news.data?.title ?? 'Notícia'}
        description={news.data?.published_at ? new Date(news.data.published_at).toLocaleString('pt-BR') : undefined}
      />
      <div className="container">
        <Link className="public-back" to="/news">
          ← Notícias
        </Link>
        {news.isLoading ? (
          <PublicEmpty>Carregando a notícia...</PublicEmpty>
        ) : news.data ? (
          <article className="public-prose">
            <div className="public-body">{news.data.body}</div>
          </article>
        ) : (
          <PublicEmpty>Esta notícia não foi encontrada.</PublicEmpty>
        )}
      </div>
    </div>
  )
}
