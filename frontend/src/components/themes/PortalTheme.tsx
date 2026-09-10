import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { contentApi, serverApi } from '../../services/api'
import type { ThemeHomeSection, ThemePresentation } from '../../services/api'
import { formatDate, formatNumber } from '../../lib/formatters'
import { themeAsset } from '../../theme/assets'

const DEFAULT_HOME_SECTIONS: ThemeHomeSection[] = ['hero', 'features', 'ranking', 'cta', 'news']

function activeRoute(pathname: string, target: string) {
  return target === '/' ? pathname === '/' : pathname === target || pathname.startsWith(`${target}/`)
}

export function PortalPublicLayout({ presentation }: { presentation: ThemePresentation }) {
  const { t } = useTranslation('public')
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div className="portal-shell" data-theme-surface="public">
      <header className="site-header">
        <div className="site-header__inner container">
          <Link to="/" className="logo" aria-label={t('portal.homeAria')}>
            <img src={themeAsset('images/logo-text.png')} alt="Valorem" />
          </Link>
          <nav className="nav-main" aria-label={t('nav.main')}>
            {presentation.navigation.map((item) => (
              <Link className={activeRoute(pathname, item.to) ? 'is-active' : undefined} key={`${item.to}-${item.label}`} to={item.to}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link className="btn-text" to={user ? '/panel' : '/login'}>{user ? t('portal.dashboard') : t('portal.login')}</Link>
            <Link className="btn-gem btn-gem--sm" to="/register">{t('portal.createAccount')}</Link>
            <button className="hamburger" type="button" aria-label={t('nav.openMenu')} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-nav${menuOpen ? ' is-open' : ''}`} hidden={!menuOpen}>
        <button className="mobile-nav__close" type="button" aria-label={t('nav.closeMenu')} onClick={() => setMenuOpen(false)}>×</button>
        <nav aria-label={t('portal.mobileNav')}>
          {presentation.navigation.map((item) => <Link key={`${item.to}-${item.label}`} to={item.to}>{item.label}</Link>)}
          <Link to={user ? '/panel' : '/login'}>{user ? t('portal.dashboard') : t('portal.login')}</Link>
          {!user ? <Link to="/register">{t('portal.createAccount')}</Link> : null}
        </nav>
      </div>

      <main><Outlet /></main>

      <footer className="site-footer">
        <div className="container">
          <Link to="/" className="logo logo--footer">
            <img src={themeAsset('images/logo-footer.png')} alt="Valorem" />
          </Link>
          <p className="site-footer__tagline">{presentation.footer.tagline}</p>
          <nav className="footer-nav" aria-label={t('portal.footerNav')}>
            {presentation.navigation.slice(0, 5).map((item) => <Link key={`${item.to}-${item.label}`} to={item.to}>{item.label}</Link>)}
          </nav>
          <p className="site-footer__copy">{presentation.footer.copyright}</p>
          <p className="site-footer__copy portal-legal-links">
            <Link to="/terms">{t('footer.terms')}</Link> · <Link to="/privacy">{t('footer.privacy')}</Link> · <Link to="/agreement">{t('footer.agreement')}</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}

type CountdownValue = { days: string; hours: string; mins: string; secs: string }

function countdownValue(target: string): CountdownValue {
  const remaining = Math.max(0, Date.parse(target) - Date.now())
  const total = Math.floor(remaining / 1000)
  const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0')
  return {
    days: pad(Math.floor(total / 86400)),
    hours: pad(Math.floor((total % 86400) / 3600)),
    mins: pad(Math.floor((total % 3600) / 60)),
    secs: pad(total % 60),
  }
}

function useCountdown(target: string) {
  const [value, setValue] = useState(() => countdownValue(target))
  useEffect(() => {
    setValue(countdownValue(target))
    const timer = window.setInterval(() => setValue(countdownValue(target)), 1000)
    return () => window.clearInterval(timer)
  }, [target])
  return value
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="section-head">
      <img className="section-head__divider" src={themeAsset('images/ui/divider.png')} alt="" />
      <h2 className="section-head__title">{title}</h2>
      {subtitle ? <p className="section-head__sub">{subtitle}</p> : null}
    </header>
  )
}

export function PortalHomePage({ presentation }: { presentation: ThemePresentation }) {
  const { t } = useTranslation('public')
  const { hero, features, ranking, cta, news: newsContent } = presentation.home
  const sections = presentation.home.sections ?? DEFAULT_HOME_SECTIONS
  const countdown = useCountdown(hero.countdownAt)
  const [activeTab, setActiveTab] = useState(ranking.tabs[0]?.id ?? '')
  const selectedTab = useMemo(
    () => ranking.tabs.find((item) => item.id === activeTab) ?? ranking.tabs[0],
    [activeTab, ranking.tabs],
  )
  const rankings = useQuery({
    queryKey: ['theme-home-ranking', selectedTab?.kind],
    queryFn: () => serverApi.rankings(selectedTab?.kind ?? 'pvp', 5),
    enabled: Boolean(selectedTab) && sections.includes('ranking'),
  })
  const news = useQuery({
    queryKey: ['news'],
    queryFn: () => contentApi.news(),
    enabled: sections.includes('news'),
  })

  const sectionNodes: Record<ThemeHomeSection, ReactNode> = {
    hero: (
      <section className="hero" key="hero">
        <div className="hero__bg" aria-hidden="true" />
        <div className="hero__content">
          <h1 className="hero__title">{hero.title}</h1>
          <p className="hero__desc">{hero.description}</p>
          <div className="countdown" aria-label={hero.countdownLabel}>
            <p className="countdown__label">{hero.countdownLabel}</p>
            <div className="countdown__grid">
              {([
                ['days', 'portal.unitDays'],
                ['hours', 'portal.unitHours'],
                ['mins', 'portal.unitMins'],
                ['secs', 'portal.unitSecs'],
              ] as const).map(([key, labelKey]) => (
                <div className="countdown__item" key={key}>
                  <span className="countdown__value">{countdown[key]}</span>
                  <span className="countdown__unit">{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
          <Link className="btn-gem btn-gem--lg" to={hero.actionTo}>{hero.actionLabel}</Link>
        </div>
      </section>
    ),
    features: (
      <section className="section" id="features" key="features">
        <div className="container">
          <SectionHeading title={features.title} subtitle={features.subtitle} />
          <div className="features-grid">
            {features.items.map((item) => (
              <article className="feature-card" key={item.title}>
                <div className="feature-card__icon"><img src={themeAsset(item.asset)} alt="" /></div>
                <h3 className="feature-card__title">{item.title}</h3>
                <p className="feature-card__desc">{item.description}</p>
              </article>
            ))}
          </div>
          <div className="section__action"><Link className="btn-gem" to={features.actionTo}>{features.actionLabel}</Link></div>
        </div>
      </section>
    ),
    ranking: (
      <section className="section" id="rating" key="ranking">
        <div className="container">
          <SectionHeading title={ranking.title} subtitle={ranking.subtitle} />
          <div className="rating-tabs" role="tablist" aria-label={ranking.title}>
            {ranking.tabs.map((tab) => (
              <button
                className={`rating-tab${tab.id === selectedTab?.id ? ' is-active' : ''}`}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === selectedTab?.id}
                onClick={() => setActiveTab(tab.id)}
              >{tab.label}</button>
            ))}
          </div>
          <div className="rating-panel is-active" role="tabpanel">
            {rankings.isLoading ? <p className="portal-state">{t('portal.ratingLoading')}</p> : rankings.isError ? <p className="portal-state">{t('portal.ratingError')}</p> : (
              <table className="rating-table">
                <thead><tr><th>{t('portal.colPosition')}</th><th>{t('portal.colCharacterClan')}</th><th>{t('portal.colScore')}</th></tr></thead>
                <tbody>
                  {(rankings.data ?? []).map((row) => (
                    <tr key={`${row.position}-${row.name}`}><td className="rank">{String(row.position).padStart(2, '0')}</td><td>{row.name}</td><td>{formatNumber(row.value)}</td></tr>
                  ))}
                  {!rankings.data?.length ? <tr><td colSpan={3}>{t('portal.ratingEmpty')}</td></tr> : null}
                </tbody>
              </table>
            )}
          </div>
          <div className="section__action"><Link className="btn-gem" to={ranking.actionTo}>{ranking.actionLabel}</Link></div>
        </div>
      </section>
    ),
    cta: (
      <section className="section section--cta" key="cta">
        <div className="cta-banner" style={{ backgroundImage: `url(${themeAsset('images/cta-banner.jpg')})` }}>
          <div className="cta-banner__content">
            <h2 className="cta-banner__title">{cta.title}</h2>
            <p className="cta-banner__desc">{cta.description}</p>
            <Link className="btn-gem" to={cta.actionTo}>{cta.actionLabel}</Link>
          </div>
        </div>
      </section>
    ),
    news: (news.data ?? []).length ? (
      <section className="section" id="news" key="news">
        <div className="container">
          <SectionHeading title={newsContent.title} />
          <div className="news-list">
            {(news.data ?? []).slice(0, 3).map((item) => (
              <Link className="news-item" key={item.id} to={`/news/${item.slug}`}>
                <h3 className="news-item__title">{item.title}</h3>
                <p className="news-item__meta">{formatDate(item.published_at)}</p>
                <p>{item.excerpt || item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ) : null,
  }

  return (
    <div className="portal-home" data-theme-page="home">
      {sections.map((name) => sectionNodes[name])}
    </div>
  )
}
