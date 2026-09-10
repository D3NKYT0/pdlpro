import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

export function DownloadsPage() {
  const { t } = useTranslation('public')
  const downloads = useQuery({ queryKey: ['downloads'], queryFn: contentApi.downloads })
  const groups = useMemo(() => {
    const items = downloads.data ?? []
    const fallback = t('downloads.defaultCategory')
    return items.reduce<Record<string, typeof items>>((acc, item) => {
      const key = item.category.trim() || fallback
      acc[key] = acc[key] ?? []
      acc[key].push(item)
      return acc
    }, {})
  }, [downloads.data, t])

  return (
    <div className="public-page">
      <PublicHero
        kicker={t('downloads.kicker')}
        title={t('downloads.title')}
        description={t('downloads.description')}
      />
      <div className="container">
        {downloads.isLoading ? (
          <PublicEmpty>{t('downloads.loading')}</PublicEmpty>
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
                      <span className="public-tile-action">{t('downloads.download')}</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))
        ) : (
          <PublicEmpty>{t('downloads.empty')}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
