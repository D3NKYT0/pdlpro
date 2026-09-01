import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

function formatNewsDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function NewsPage() {
  const news = useQuery({ queryKey: ['news'], queryFn: contentApi.news })

  return (
    <div className="public-page">
      <PublicHero
        kicker="Comunidade"
        title="Notícias"
        description="Atualizações, eventos e o que acontece no reino."
      />
      <div className="container">
        {news.isLoading ? (
          <PublicEmpty>Consultando as últimas notícias...</PublicEmpty>
        ) : (news.data ?? []).length ? (
          <div className="public-grid">
            {(news.data ?? []).map((item) => (
              <Link className="public-tile" key={item.id} to={`/news/${item.slug}`}>
                <div>
                  <span className="public-kicker">
                    {item.published_at ? formatNewsDate(item.published_at) : 'Notícia'}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                  <em>Ler mais</em>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <PublicEmpty>Nenhuma notícia publicada no momento.</PublicEmpty>
        )}
      </div>
    </div>
  )
}
