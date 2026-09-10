import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'
import { contentLang } from '../i18n/locale'

export function WikiPage() {
  const { t, i18n } = useTranslation('public')
  const [query, setQuery] = useState('')
  const language = contentLang(i18n.language)
  const pages = useQuery({
    queryKey: ['wiki', query, language],
    queryFn: () => contentApi.wiki(query || undefined, language),
  })

  return (
    <div className="public-page">
      <PublicHero
        kicker={t('wiki.kicker')}
        title={t('wiki.title')}
        description={t('wiki.description')}
      />
      <div className="container">
        <input
          className="public-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('wiki.searchPlaceholder')}
          aria-label={t('wiki.searchAria')}
        />
        {pages.isLoading ? (
          <PublicEmpty>{t('wiki.loading')}</PublicEmpty>
        ) : (pages.data ?? []).length ? (
          <div className="public-rows">
            {(pages.data ?? []).map((page) => (
              <Link key={page.id} to={`/wiki/${page.slug}`}>
                {page.category ? <span className="public-kicker">{page.category}</span> : null}
                <h3>{page.title}</h3>
                <p>{page.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <PublicEmpty>
            {t('wiki.empty')}
            {query ? t('wiki.emptyRetry') : null}
            {t('wiki.emptyHintBefore')}
            <Link to="/info">{t('wiki.seeInfo')}</Link>
            {t('wiki.emptyHintAfter')}
          </PublicEmpty>
        )}
      </div>
    </div>
  )
}
