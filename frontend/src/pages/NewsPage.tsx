import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contentApi } from '../services/api'

export function NewsPage() {
  const news = useQuery({ queryKey: ['news'], queryFn: contentApi.news })

  return (
    <section className="card">
      <h1>Notícias</h1>
      {(news.data ?? []).map((item) => (
        <article key={item.id}>
          <h2>
            <Link to={`/news/${item.slug}`}>{item.title}</Link>
          </h2>
          <p className="muted">{item.excerpt}</p>
        </article>
      ))}
      {!news.data?.length && <p className="muted">Nenhuma notícia publicada.</p>}
    </section>
  )
}
