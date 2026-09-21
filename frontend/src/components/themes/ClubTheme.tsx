import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleUserRound } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LANDING_PATHS, useLandingPath } from '../../hooks/useLandingPath'
import { contentApi, programsApi, serverApi } from '../../services/api'
import { contentLang } from '../../i18n/locale'
import type { ThemeHomeSection, ThemePresentation, ThemeStatItem } from '../../services/api'
import { formatDate, formatNumber } from '../../lib/formatters'
import { CharacterAvatar } from '../character/CharacterAvatar'
import { rankingPortrait } from '../rankings/rankingsFormat'
import { themeAsset, themeImage } from '../../theme/assets'
import { useTheme } from '../../theme/ThemeProvider'
import { extensionNavItems, isExtensionResourceEnabled } from '../../extensions'
import { PdlHeroEmblem, PdlSymbol } from '../PdlSymbol'
import { ThemeHeroVideo } from '../ThemeHeroVideo'
import { ButtonLink } from '../ui/Button'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { ErrorNotice, LoadingState } from '../ui/Feedback'

const DEFAULT_HOME_SECTIONS: ThemeHomeSection[] = [
  'hero', 'stats', 'features', 'pillars', 'news', 'cta', 'ranking',
]
const DOCK_SECTIONS: ThemeHomeSection[] = ['news', 'cta', 'ranking']

function activeRoute(pathname: string, target: string) {
  if (LANDING_PATHS.includes(target)) return LANDING_PATHS.includes(pathname)
  return pathname === target || pathname.startsWith(`${target}/`)
}

function visibleSections(presentation: ThemePresentation) {
  const declared = presentation.home.sections ?? DEFAULT_HOME_SECTIONS
  return declared.filter((name) => {
    if (name === 'stats') return Boolean(presentation.home.stats?.items.length)
    if (name === 'pillars') return Boolean(presentation.home.pillars?.items.length)
    return true
  })
}

export function ClubPublicLayout({ presentation }: { presentation: ThemePresentation }) {
  const { t } = useTranslation('public')
  const { user } = useAuth()
  const { pathname } = useLocation()
  const landingPath = useLandingPath()
  const theme = useTheme()
  const packedCircle = theme.assets['images/logo-circle.png']
  const [menuOpen, setMenuOpen] = useState(false)
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const navigation = [
    ...presentation.navigation.map((item) =>
      item.to === '/' ? { ...item, to: landingPath } : item,
    ),
    ...extensionNavItems('public')
      .filter((item) => isExtensionResourceEnabled(resources.data, item.resource))
      .map((item) => ({
        label: t(item.labelKey, { ns: item.ns }),
        to: item.to,
      })),
  ]
  const downloadsEnabled = !resources.data?.some((item) => item.code === 'downloads' && !item.enabled)

  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div className="club-shell" data-theme-surface="public" data-theme-renderer="club-v1">
      <header className="club-header">
        <div className="club-header__inner club-wrap">
          <nav className="club-nav" aria-label={t('nav.main')}>
            {navigation.map((item) => (
              <Link className={activeRoute(pathname, item.to) ? 'is-active' : undefined} key={`${item.to}-${item.label}`} to={item.to}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="club-header__actions site-nav-actions">
            <LanguageSwitcher className="language-switcher site-nav-language" id="club-language" />
            <Link className="user" to={user ? '/panel' : '/login'}>
              <CircleUserRound aria-hidden="true" />
              <span>{user ? t('nav.myAccount') : t('nav.signIn')}</span>
            </Link>
            {downloadsEnabled ? <Link className="download" to="/downloads">{t('nav.download')}</Link> : null}
            <button className="club-hamburger" type="button" aria-label={t('nav.openMenu')} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`club-mobile${menuOpen ? ' is-open' : ''}`} hidden={!menuOpen}>
        <button className="club-mobile__close" type="button" aria-label={t('nav.closeMenu')} onClick={() => setMenuOpen(false)}>×</button>
        <nav aria-label={t('portal.mobileNav')}>
          {navigation.map((item) => <Link key={`${item.to}-${item.label}`} to={item.to}>{item.label}</Link>)}
          <Link to={user ? '/panel' : '/login'}>{user ? t('nav.myAccount') : t('nav.signIn')}</Link>
          {downloadsEnabled ? <Link to="/downloads">{t('nav.download')}</Link> : null}
          {!user ? <Link to="/register">{t('portal.createAccount')}</Link> : null}
        </nav>
      </div>

      <main><Outlet /></main>

      <footer className="club-footer">
        <div className="club-wrap club-footer__inner">
          <div className="club-footer__brand">
            <Link to={landingPath} className="club-logo club-logo--footer" aria-label={t('nav.home')}>
              {packedCircle ? (
                <img src={packedCircle} alt="" />
              ) : (
                <PdlSymbol className="club-logo__mark" />
              )}
            </Link>
            <p className="club-footer__tagline">{presentation.footer.tagline}</p>
          </div>
          <nav className="club-footer__nav" aria-label={t('portal.footerNav')}>
            {navigation.slice(0, 5).map((item) => <Link key={`${item.to}-${item.label}`} to={item.to}>{item.label}</Link>)}
          </nav>
          <div className="club-footer__base">
            <p className="club-footer__copy">{presentation.footer.copyright}</p>
            <p className="club-footer__legal">
              <Link to="/terms">{t('footer.terms')}</Link> · <Link to="/privacy">{t('footer.privacy')}</Link> · <Link to="/agreement">{t('footer.agreement')}</Link> · <Link to="/cookies">{t('footer.cookies')}</Link> · <Link to="/lgpd">{t('footer.lgpd')}</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function statValue(
  item: ThemeStatItem,
  status: { players_online: number; game_online: boolean } | undefined,
  info: { chronicle?: string; rates?: Record<string, string> } | undefined,
  t: (key: string) => string,
) {
  if (item.kind === 'online') return formatNumber(status?.players_online ?? 0)
  if (item.kind === 'chronicle') return item.value || info?.chronicle || '—'
  if (item.kind === 'rates') return item.value || info?.rates?.xp || '—'
  if (item.kind === 'status') return status?.game_online ? t('club.live') : t('club.offline')
  return item.value || '—'
}

export function ClubHomePage({ presentation }: { presentation: ThemePresentation }) {
  const { t, i18n } = useTranslation('public')
  const language = contentLang(i18n.language)
  const { hero, features, ranking, cta, news: newsContent, stats, pillars } = presentation.home
  const sections = visibleSections(presentation)
  const [activeTab, setActiveTab] = useState(ranking.tabs[0]?.id ?? '')
  const selectedTab = useMemo(
    () => ranking.tabs.find((item) => item.id === activeTab) ?? ranking.tabs[0],
    [activeTab, ranking.tabs],
  )
  const status = useQuery({
    queryKey: ['server-status'],
    queryFn: serverApi.status,
    enabled: sections.includes('stats'),
  })
  const info = useQuery({
    queryKey: ['server-info'],
    queryFn: serverApi.info,
    enabled: sections.includes('stats'),
  })
  const rankings = useQuery({
    queryKey: ['theme-home-ranking', selectedTab?.kind],
    queryFn: () => serverApi.rankings(selectedTab?.kind ?? 'pvp', 5),
    enabled: Boolean(selectedTab) && sections.includes('ranking'),
  })
  const news = useQuery({
    queryKey: ['news', language],
    queryFn: () => contentApi.news(language),
    enabled: sections.includes('news'),
  })

  const dockVisible = DOCK_SECTIONS.filter((name) => sections.includes(name))
  const useDock = dockVisible.length >= 2

  const sectionNodes: Partial<Record<ThemeHomeSection, ReactNode>> = {
    hero: (
      <section className="h club-hero" key="hero">
        <ThemeHeroVideo />
        <div className="h-logo">
          <PdlHeroEmblem />
        </div>
        {hero.kicker ? <p className="club-kicker">{hero.kicker}</p> : null}
        <h1 className="club-hero__title">{hero.title}</h1>
        {hero.subtitle ? <p className="club-hero__subtitle">{hero.subtitle}</p> : null}
        <p className="hero-description">{hero.description}</p>
        <div className="h-link">
          <Link to={hero.actionTo}>{hero.actionLabel}</Link>
          {hero.secondaryLabel && hero.secondaryTo ? (
            <Link to={hero.secondaryTo}>{hero.secondaryLabel}</Link>
          ) : null}
        </div>
        <div className="h-scroll">
          <a href={sections.includes('stats') ? '#club-stats' : '#features'} aria-label={t('nav.exploreRealm')}>
            <img src={themeImage('icons/scroll.png')} alt="" />
          </a>
        </div>
      </section>
    ),
    stats: stats ? (
      <section className="club-stats" id="club-stats" key="stats" aria-label={t('club.statsAria')}>
        <div className="club-wrap club-stats__grid">
          {status.isLoading || info.isLoading ? (
            <LoadingState>{t('club.statsLoading')}</LoadingState>
          ) : status.isError || info.isError ? (
            <ErrorNotice error={status.error ?? info.error} fallback={t('club.statsError')} />
          ) : (
            stats.items.map((item) => (
              <article className="club-stat" key={item.id}>
                <strong>{statValue(item, status.data, info.data, t)}</strong>
                <span>{item.label}</span>
              </article>
            ))
          )}
        </div>
      </section>
    ) : null,
    features: (
      <section className="club-section" id="features" key="features">
        <div className="club-wrap">
          <header className="club-section__head">
            <p className="club-kicker">{features.subtitle}</p>
            <h2>{features.title}</h2>
          </header>
          <div className="club-features">
            {features.items.map((item) => (
              <article className="club-feature" key={item.title}>
                <div
                  className="club-feature__art"
                  style={{ '--club-feature-art': `url(${JSON.stringify(themeAsset(item.asset))})` } as CSSProperties}
                />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          <div className="club-section__action">
            <ButtonLink className="club-cta-secondary" variant="secondary" to={features.actionTo}>
              {features.actionLabel}
            </ButtonLink>
          </div>
        </div>
      </section>
    ),
    pillars: pillars ? (
      <section className="club-pillars" key="pillars">
        <div className="club-wrap">
          {pillars.title ? <h2 className="club-pillars__title">{pillars.title}</h2> : null}
          <div className="club-pillars__grid">
            {pillars.items.map((item, index) => (
              <article className="club-pillar" key={item.title}>
                <span className="club-pillar__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    ) : null,
    ranking: (
      <section className="club-ranking" key="ranking">
        <header className="club-section__head">
          <div>
            {ranking.subtitle ? <p className="club-kicker">{ranking.subtitle}</p> : null}
            <h2>{ranking.title}</h2>
          </div>
          <ButtonLink className="club-dock__more" variant="secondary" size="sm" to={ranking.actionTo}>
            {ranking.actionLabel}
          </ButtonLink>
        </header>
        <div className="club-ranking__tabs" role="tablist" aria-label={ranking.title}>
          {ranking.tabs.map((tab) => (
            <button
              className={`club-ranking__tab${tab.id === selectedTab?.id ? ' is-active' : ''}`}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === selectedTab?.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="club-ranking__panel" role="tabpanel">
          {rankings.isLoading ? <LoadingState>{t('portal.ratingLoading')}</LoadingState> : rankings.isError ? (
            <ErrorNotice error={rankings.error} fallback={t('portal.ratingError')} />
          ) : (
            <table className="club-ranking__table">
              <thead>
                <tr>
                  <th>{t('portal.colPosition')}</th>
                  <th>{t('portal.colCharacterClan')}</th>
                  <th>{t('portal.colScore')}</th>
                </tr>
              </thead>
              <tbody>
                {(rankings.data ?? []).map((row) => {
                  const portrait = rankingPortrait(row)
                  return (
                    <tr key={`${row.position}-${row.name}`}>
                      <td>{String(row.position).padStart(2, '0')}</td>
                      <td>
                        {portrait ? (
                          <span className="club-ranking__name">
                            <CharacterAvatar name={row.name} classId={portrait.classId} sex={portrait.sex} size="sm" />
                            {row.name}
                          </span>
                        ) : row.name}
                      </td>
                      <td>{formatNumber(row.value)}</td>
                    </tr>
                  )
                })}
                {!rankings.data?.length ? (
                  <tr><td colSpan={3}>{t('portal.ratingEmpty')}</td></tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </section>
    ),
    cta: (
      <section className="club-cta-card" key="cta" style={{ backgroundImage: `url(${themeAsset('images/cta-banner.jpg')})` }}>
        <div className="club-cta-card__content">
          <h2>{cta.title}</h2>
          <p>{cta.description}</p>
          <ButtonLink className="club-cta-primary" to={cta.actionTo}>{cta.actionLabel}</ButtonLink>
        </div>
      </section>
    ),
    news: (
      <section className="club-news" key="news">
        <header className="club-section__head">
          <h2>{newsContent.title}</h2>
          <ButtonLink className="club-dock__more" variant="secondary" size="sm" to="/news">
            {t('club.viewAllNews')}
          </ButtonLink>
        </header>
        {news.isLoading ? <LoadingState>{t('club.newsLoading')}</LoadingState> : news.isError ? (
          <ErrorNotice error={news.error} fallback={t('club.newsError')} />
        ) : (news.data ?? []).length ? (
          <ul className="club-news__list">
            {(news.data ?? []).slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link to={`/news/${item.slug}`}>
                  <strong>{item.title}</strong>
                  <span>{formatDate(item.published_at)}</span>
                  <p>{item.excerpt || item.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="club-empty">{t('club.newsEmpty')}</p>
        )}
      </section>
    ),
  }

  const body = useDock
    ? [
        ...sections.filter((name) => !DOCK_SECTIONS.includes(name)).map((name) => sectionNodes[name]),
        <section className="club-dock" key="dock">
          <div className="club-wrap club-dock__grid">
            {dockVisible.map((name) => sectionNodes[name])}
          </div>
        </section>,
      ]
    : sections.map((name) => sectionNodes[name])

  return (
    <div className="club-home" data-theme-page="home">
      {body}
    </div>
  )
}
