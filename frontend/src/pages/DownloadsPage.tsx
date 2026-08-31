import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../services/api'

export function DownloadsPage() {
  const downloads = useQuery({ queryKey: ['downloads'], queryFn: contentApi.downloads })

  return (
    <div className="theme-page">
      <section className="theme-panel container">
        <h1>Downloads</h1>
        {(downloads.data ?? []).map((item) => (
          <p key={item.id}>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.title}
            </a>
            <span> — {item.category}</span>
          </p>
        ))}
        {!downloads.data?.length ? <p>Nenhum download publicado.</p> : null}
      </section>
    </div>
  )
}
