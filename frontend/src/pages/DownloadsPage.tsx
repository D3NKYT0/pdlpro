import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

export function DownloadsPage() {
  const downloads = useQuery({ queryKey: ['downloads'], queryFn: contentApi.downloads })
  const groups = useMemo(() => {
    const items = downloads.data ?? []
    return items.reduce<Record<string, typeof items>>((acc, item) => {
      const key = item.category.trim() || 'Cliente'
      acc[key] = acc[key] ?? []
      acc[key].push(item)
      return acc
    }, {})
  }, [downloads.data])

  return (
    <div className="public-page">
      <PublicHero
        kicker="Cliente"
        title="Downloads"
        description="Baixe o cliente, patches e o que for preciso para entrar no servidor."
      />
      <div className="container">
        {downloads.isLoading ? (
          <PublicEmpty>Consultando os arquivos...</PublicEmpty>
        ) : Object.keys(groups).length ? (
          Object.entries(groups).map(([category, items]) => (
            <section className="public-section" key={category}>
              <h2>{category}</h2>
              <div className="public-grid">
                {items.map((item) => (
                  <a className="public-tile public-download" key={item.id} href={item.url} target="_blank" rel="noreferrer">
                    <div>
                      <i className="fa-solid fa-download" aria-hidden="true" />
                      <strong>{item.title}</strong>
                      <span className="public-tile-action">Baixar</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))
        ) : (
          <PublicEmpty>Nenhum download publicado no momento.</PublicEmpty>
        )}
      </div>
    </div>
  )
}
