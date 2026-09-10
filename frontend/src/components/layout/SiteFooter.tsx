import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { themeImage } from '../../theme/assets'
import { programsApi } from '../../services/api'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { PdlSymbol } from '../PdlSymbol'

export function SiteFooter() {
  const { t } = useTranslation('public')
  const year = new Date().getFullYear()
  const discord = import.meta.env.VITE_DISCORD_URL as string | undefined
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const visible = (resource?: string) =>
    !resource || !resources.data?.some((r) => r.code === resource && !r.enabled)
  const downloadsEnabled = visible('downloads')

  const exploreLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/info', label: t('nav.info') },
    { to: '/rankings', label: t('nav.rankings'), resource: 'rankings' },
    { to: '/wiki', label: t('nav.wiki'), resource: 'wiki' },
    { to: '/news', label: t('nav.news'), resource: 'news' },
  ]

  const accountLinks = [
    { to: '/login', label: t('nav.signIn') },
    { to: '/panel', label: t('footer.panel') },
    { to: '/roadmap', label: t('nav.roadmap'), resource: 'roadmap' },
    { to: '/faq', label: t('footer.faq'), resource: 'faq' },
  ]

  const legalLinks = [
    { to: '/agreement', label: t('footer.agreement') },
    { to: '/terms', label: t('footer.terms') },
    { to: '/privacy', label: t('footer.privacy') },
  ]

  return (
    <footer className="site-footer">
      <div className="site-footer-shell container">
        <div className="site-footer-brand">
          <Link className="site-footer-brand-link" to="/" aria-label={t('nav.brandHome')}>
            <PdlSymbol className="site-footer-mark" />
            <span className="site-footer-brand-copy">
              <strong>PDL PRO</strong>
              <small>Lineage</small>
            </span>
          </Link>
          <p>{t('footer.tagline')}</p>
          <div className="site-footer-actions">
            {downloadsEnabled ? (
              <Link className="site-footer-download" to="/downloads">
                {t('nav.download')}
              </Link>
            ) : null}
            <Link className="site-footer-account" to="/register">
              {t('footer.createAccount')}
            </Link>
            {discord ? (
              <a className="site-footer-community" href={discord} target="_blank" rel="noreferrer">
                {t('footer.community')}
              </a>
            ) : null}
          </div>
        </div>

        <div className="site-footer-col" role="navigation" aria-label={t('footer.exploreNav')}>
          <h2>{t('footer.explore')}</h2>
          <ul>
            {exploreLinks.filter((item) => visible(item.resource)).map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-col" role="navigation" aria-label={t('footer.accountNav')}>
          <h2>{t('footer.account')}</h2>
          <ul>
            {accountLinks.filter((item) => visible(item.resource)).map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-col" role="navigation" aria-label={t('footer.legalNav')}>
          <h2>{t('footer.legal')}</h2>
          <ul>
            {legalLinks.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer-bar">
        <div className="site-footer-bar-inner container">
          <p>{t('footer.rights', { year })}</p>
          <span className="site-footer-locale">
            <img src={themeImage('icons/world.png')} alt="" aria-hidden="true" />
            <LanguageSwitcher className="language-switcher site-footer-language" id="footer-language" />
          </span>
        </div>
      </div>
    </footer>
  )
}
