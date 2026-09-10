import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'
import { contentLang } from '../i18n/locale'

export function LegalHistoryPage() {
  const { t, i18n } = useTranslation('public')
  const language = contentLang(i18n.language)
  const history = useQuery({
    queryKey: ['legal-history', language],
    queryFn: () => contentApi.legalHistory(language),
  })

  const legalNav = [
    { to: '/agreement', label: t('legal.agreement') },
    { to: '/terms', label: t('legal.terms') },
    { to: '/privacy', label: t('legal.privacy') },
    { to: '/cookies', label: t('legal.cookies') },
    { to: '/lgpd', label: t('legal.lgpd') },
    { to: '/legal/history', label: t('legal.history') },
  ]

  return (
    <div className="public-page">
      <PublicHero kicker={t('legal.historyKicker')} title={t('legal.historyTitle')} />
      <nav className="public-nav container" aria-label={t('legal.navAria')}>
        {legalNav.map((item) => (
          <Link key={item.to} to={item.to} className={item.to === '/legal/history' ? 'is-active' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="container">
        {history.isLoading ? (
          <PublicEmpty>{t('legal.loading')}</PublicEmpty>
        ) : history.data?.history?.length ? (
          <div className="public-prose legal-history">
            <p className="public-body">{t('legal.historyIntro')}</p>
            <ul className="legal-history-list">
              {history.data.history.map((entry) => (
                <li key={entry.version} className="legal-history-item">
                  <h2>
                    {t('legal.historyVersion', { version: entry.version })}
                    {entry.is_current ? (
                      <span className="public-kicker"> {t('legal.historyCurrent')}</span>
                    ) : (
                      <span className="public-kicker"> {t('legal.historyPrevious')}</span>
                    )}
                  </h2>
                  <p>
                    <strong>{entry.title}</strong>
                  </p>
                  <p className="muted">
                    {entry.effective_until
                      ? t('legal.historyRange', {
                          from: entry.effective_from,
                          until: entry.effective_until,
                        })
                      : t('legal.historyFrom', { from: entry.effective_from })}
                  </p>
                  <h3>{t('legal.historyChanges')}</h3>
                  <ul>
                    {entry.changes.map((change) => (
                      <li key={`${entry.version}-${change.area}`}>
                        <strong>{change.area}:</strong> {change.reason}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <PublicEmpty>{t('legal.unavailable')}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
