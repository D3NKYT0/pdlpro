import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../services/api'

export function DownloadsPage() {
  const downloads = useQuery({ queryKey: ['downloads'], queryFn: contentApi.downloads })

  return (
    <section className="card">
      <h1>Downloads</h1>
      {(downloads.data ?? []).map((item) => (
        <p key={item.id}>
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
          <span className="muted"> — {item.category}</span>
        </p>
      ))}
      {!downloads.data?.length && <p className="muted">Nenhum download publicado.</p>}
    </section>
  )
}
