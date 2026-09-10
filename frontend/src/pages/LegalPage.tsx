import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { useOptionalCookieConsent } from '../contexts/CookieConsentContext'
import { sanitizeRichText } from '../lib/rich-text'
import { contentApi } from '../services/api'
import { contentLang } from '../i18n/locale'

const SLUGS: Record<string, string> = {
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/agreement': 'agreement',
  '/cookies': 'cookies',
  '/lgpd': 'lgpd',
}

function CookiePrefsLink() {
  const { t } = useTranslation('public')
  const consent = useOptionalCookieConsent()
  if (!consent) return null
  return (
    <p>
      <button type="button" className="linkish" onClick={consent.openSettings}>
        {t('legal.openCookiePrefs')}
      </button>
    </p>
  )
}

export function LegalPage() {
  const { t, i18n } = useTranslation('public')
  const { pathname } = useLocation()
  const slug = SLUGS[pathname] ?? 'terms'
  const language = contentLang(i18n.language)
  const doc = useQuery({
    queryKey: ['legal', slug, language],
    queryFn: () => contentApi.legalDocument(slug, language),
  })

  const legalNav = [
    { to: '/agreement', label: t('legal.agreement') },
    { to: '/terms', label: t('legal.terms') },
    { to: '/privacy', label: t('legal.privacy') },
    { to: '/cookies', label: t('legal.cookies') },
    { to: '/lgpd', label: t('legal.lgpd') },
    { to: '/legal/history', label: t('legal.history') },
  ]

  const bodyHtml =
    doc.data?.format === 'html' || (doc.data?.body?.includes('<') ?? false)
      ? sanitizeRichText(doc.data?.body ?? '')
      : null

  return (
    <div className="public-page">
      <PublicHero kicker={t('legal.kicker')} title={doc.data?.title ?? t('legal.titleFallback')} />
      <nav className="public-nav container" aria-label={t('legal.navAria')}>
        {legalNav.map((item) => (
          <Link key={item.to} to={item.to} className={pathname === item.to ? 'is-active' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="container">
        {doc.isLoading ? (
          <PublicEmpty>{t('legal.loading')}</PublicEmpty>
        ) : doc.data ? (
          <article className="public-prose">
            {doc.data.version ? <span className="public-kicker">{t('legal.version', { version: doc.data.version })}</span> : null}
            {bodyHtml ? (
              <div
                className="public-body public-body--rich"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <div className="public-body">{doc.data.body}</div>
            )}
            {pathname === '/cookies' ? <CookiePrefsLink /> : null}
          </article>
        ) : (
          <PublicEmpty>{t('legal.unavailable')}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
