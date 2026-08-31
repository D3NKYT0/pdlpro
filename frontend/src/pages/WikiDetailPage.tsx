import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { contentApi } from '../services/api'

export function WikiDetailPage() {
  const { slug = '' } = useParams()
  const page = useQuery({ queryKey: ['wiki-page', slug], queryFn: () => contentApi.wikiPage(slug) })

  return (
    <div className="wiki">
      <div className="w-content container">
        <p>
          <Link to="/wiki">← Wiki</Link>
        </p>
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">{page.data?.title ?? 'Wiki'}</h1>
          </div>
          <div className="card-body">
            <p className="card-text">{page.data?.category}</p>
            <div style={{ whiteSpace: 'pre-wrap' }}>{page.data?.body}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
