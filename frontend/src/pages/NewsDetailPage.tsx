import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { RichTextContent } from '../components/ui/RichText'
import { contentApi } from '../services/api'
import { contentLang, INTL_LOCALES } from '../i18n/locale'

export function NewsDetailPage() {
  const { t, i18n } = useTranslation('public')
  const { slug = '' } = useParams()
  const language = contentLang(i18n.language)
  const news = useQuery({
    queryKey: ['news', slug, language],
    queryFn: () => contentApi.newsDetail(slug, language),
    enabled: Boolean(slug),
  })

  return (
    <div className="public-page">
      <PublicHero
        kicker={t('news.kicker')}
        title={news.data?.title ?? t('news.itemFallback')}
        description={
          news.data?.published_at
            ? new Date(news.data.published_at).toLocaleString(INTL_LOCALES[language])
            : undefined
        }
      />
      <div className="container">
        <Link className="public-back" to="/news">
          {t('news.back')}
        </Link>
        {news.isLoading ? (
          <PublicEmpty>{t('news.detailLoading')}</PublicEmpty>
        ) : news.data ? (
          <article className="public-prose">
            <RichTextContent html={news.data.body} className="public-body" />
          </article>
        ) : (
          <PublicEmpty>{t('news.notFound')}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
