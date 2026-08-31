import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { contentApi } from '../services/api'

export function NewsDetailPage() {
  const { slug = '' } = useParams()
  const news = useQuery({ queryKey: ['news', slug], queryFn: () => contentApi.newsDetail(slug), enabled: Boolean(slug) })

  if (!news.data) return <p className="muted">Carregando...</p>

  return (
    <article className="card">
      <h1>{news.data.title}</h1>
      <p className="muted">{news.data.published_at}</p>
      <p>{news.data.body}</p>
    </article>
  )
}
