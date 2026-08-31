import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { contentApi } from '../services/api'

export function WikiDetailPage() {
  const { slug = '' } = useParams()
  const page = useQuery({ queryKey: ['wiki-page', slug], queryFn: () => contentApi.wikiPage(slug) })

  return (
    <section className="card">
      <p>
        <Link to="/wiki">← Wiki</Link>
      </p>
      <h1>{page.data?.title ?? 'Wiki'}</h1>
      <p className="muted">{page.data?.category}</p>
      <div style={{ whiteSpace: 'pre-wrap' }}>{page.data?.body}</div>
    </section>
  )
}
