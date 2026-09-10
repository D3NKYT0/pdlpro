import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'
import { contentLang, INTL_LOCALES } from '../i18n/locale'

export function NewsPage() {
  const { t, i18n } = useTranslation('public')
  const language = contentLang(i18n.language)
  const news = useQuery({
    queryKey: ['news', language],
    queryFn: () => contentApi.news(language),
  })

  const formatNewsDate = (value: string) =>
    new Date(value).toLocaleDateString(INTL_LOCALES[language])

  return (
    <div className="public-page">
      <PublicHero
        kicker={t('news.kicker')}
        title={t('news.title')}
        description={t('news.description')}
      />
      <div className="container">
        {news.isLoading ? (
          <PublicEmpty>{t('news.loading')}</PublicEmpty>
        ) : (news.data ?? []).length ? (
          <div className="public-grid">
            {(news.data ?? []).map((item) => (
              <Link className="public-tile" key={item.id} to={`/news/${item.slug}`}>
                <div>
                  <span className="public-kicker">
                    {item.published_at ? formatNewsDate(item.published_at) : t('news.itemFallback')}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                  <em>{t('news.readMore')}</em>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <PublicEmpty>{t('news.empty')}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
