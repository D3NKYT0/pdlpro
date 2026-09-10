import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'
import { contentLang } from '../i18n/locale'

export function WikiDetailPage() {
  const { t, i18n } = useTranslation('public')
  const { slug = '' } = useParams()
  const language = contentLang(i18n.language)
  const page = useQuery({
    queryKey: ['wiki-page', slug, language],
    queryFn: () => contentApi.wikiPage(slug, language),
    enabled: Boolean(slug),
  })

  return (
    <div className="public-page">
      <PublicHero kicker={page.data?.category || t('wiki.kicker')} title={page.data?.title ?? t('wiki.title')} />
      <div className="container">
        <Link className="public-back" to="/wiki">
          {t('wiki.back')}
        </Link>
        {page.isLoading ? (
          <PublicEmpty>{t('wiki.detailLoading')}</PublicEmpty>
        ) : page.data ? (
          <article className="public-prose">
            {page.data.summary ? <p className="public-lead">{page.data.summary}</p> : null}
            <div className="public-body">{page.data.body}</div>
          </article>
        ) : (
          <PublicEmpty>{t('wiki.notFound')}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
