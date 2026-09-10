import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { contentApi, serverApi } from '../services/api'
import { themeImage } from '../theme/assets'
import { useTheme } from '../theme/ThemeProvider'
import { PortalHomePage } from '../components/themes/PortalTheme'
import { PdlHeroEmblem } from '../components/PdlSymbol'

function clanInitial(name: string) {
  return (name.trim()[0] || '?').toUpperCase()
}

function sectionArt(image: string) {
  return { '--section-art': `url(${themeImage(image)})` } as CSSProperties
}

function DefaultHomePage() {
  const { t, i18n } = useTranslation('public')
  const theme = useTheme()
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const news = useQuery({ queryKey: ['news'], queryFn: () => contentApi.news() })
  const wiki = useQuery({ queryKey: ['wiki'], queryFn: () => contentApi.wiki() })
  const clans = useQuery({ queryKey: ['rankings', 'clans'], queryFn: () => serverApi.rankings('clans') })
  const discord = import.meta.env.VITE_DISCORD_URL as string | undefined
  const trailerId = (import.meta.env.VITE_TRAILER_YOUTUBE_ID as string | undefined) || 'Mm19W1PKMFQ'
  const [trailerPlaying, setTrailerPlaying] = useState(false)
  const numberLocale = i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR'
  const formatScore = (value: number) => value.toLocaleString(numberLocale)

  const wikiLinks = [
    { to: '/info#rates', label: t('home.wikiRates') },
    { to: '/info#enchant', label: t('home.wikiEnchant') },
    { to: '/info#pvp', label: t('home.wikiSiege') },
    { to: '/info#comecar', label: t('home.wikiStart') },
    { to: '/faq', label: t('home.wikiFaq') },
  ]

  const chronicleCards = [
    {
      to: '/news',
      image: 'home/archive-v2.webp',
      kicker: t('home.chronicleKicker'),
      title: t('home.chronicleNews'),
    },
    {
      to: '/roadmap',
      image: 'home/cinematic-v2.webp',
      kicker: t('home.seasonKicker'),
      title: t('home.seasonRoadmap'),
    },
  ]

  const rankingLinks = [
    { to: '/rankings?tab=pvp', label: t('home.rankTabPvp'), icon: 'fa-khanda' },
    { to: '/rankings?tab=pk', label: t('home.rankTabPk'), icon: 'fa-skull' },
    { to: '/rankings?tab=adena', label: t('home.rankTabAdena'), icon: 'fa-coins' },
    { to: '/rankings?tab=clans', label: t('home.rankTabClans'), icon: 'fa-shield-halved' },
    { to: '/rankings?tab=level', label: t('home.rankTabLevel'), icon: 'fa-star' },
    { to: '/rankings?tab=olympiad', label: t('home.rankTabOlympiad'), icon: 'fa-trophy' },
  ]

  const features = [
    {
      to: '/info#rates',
      image: 'home/chronicle-rates-v2.webp',
      title: t('home.featureRatesTitle'),
      blurb: t('home.featureRatesBlurb'),
    },
    {
      to: '/info#pvp',
      image: 'home/castle-siege-v2.webp',
      title: t('home.featureSiegeTitle'),
      blurb: t('home.featureSiegeBlurb'),
    },
    {
      to: '/rankings',
      image: 'home/hall-of-fame-v2.webp',
      title: t('home.featureFameTitle'),
      blurb: t('home.featureFameBlurb'),
    },
  ]

  const envName = (import.meta.env.VITE_SERVER_NAME as string | undefined)?.trim()
  const envDescription = (import.meta.env.VITE_SERVER_DESCRIPTION as string | undefined)?.trim()
  const packagedName = !theme.builtin ? theme.name?.trim() : ''
  const packagedDescription = !theme.builtin ? theme.description?.trim() : ''
  const serverName = envName || packagedName || t('home.defaultTitle')
  const serverDescription = envDescription || packagedDescription || t('home.defaultDescription')
  const wikiItems = wiki.data?.length
    ? wiki.data.slice(0, 5).map((page) => ({ to: `/wiki/${page.slug}`, label: page.title }))
    : wikiLinks
  const updateCards = (news.data ?? []).length
    ? (news.data ?? []).slice(0, 2).map((item, index) => ({
        to: `/news/${item.slug}`,
        image: chronicleCards[index % chronicleCards.length].image,
        kicker: t('home.updateKicker'),
        title: item.title,
      }))
    : chronicleCards

  return (
    <div data-theme-part="home">
      <div className="video">
        <video autoPlay muted loop playsInline src={themeImage('video.mp4')} onError={(event) => event.currentTarget.remove()} />
      </div>

      <section className="h">
        <div className="h-logo"><PdlHeroEmblem /></div>
        <h1>{serverName}</h1>
        <p className="hero-description">"{serverDescription}"</p>
        <div className="h-link">
          <Link to="/downloads">{t('home.downloadGame')}</Link>
          <Link to="/register">{t('home.createMaster')}</Link>
        </div>
        <div className="h-scroll">
          <a href="#features">
            <img src={themeImage('icons/scroll.png')} alt="" />
          </a>
        </div>
      </section>

      <section className="f home-features" id="features">
        <div className="f-title title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            {t('home.featuresKicker')}
          </span>
          <h1>{t('home.featuresTitle')}</h1>
        </div>
        <div className="character" aria-hidden="true">
          <img src={themeImage('home/aden-guardian-v2.webp')} alt="" />
        </div>
        <div className="f-list container">
          {features.map((item, index) => (
            <Link className={`f${index + 1}`} key={item.to} to={item.to}>
              <div style={{ background: `url(${themeImage(item.image)}) center / cover no-repeat` }}>
                <span>
                  <p>{item.title}</p>
                  <em>{item.blurb}</em>
                  <img src={themeImage('features/icon.png')} alt="" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="w home-wiki" style={sectionArt('home/archive-v2.webp')}>
        <div className="w-title title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            {t('home.wikiKicker')}
          </span>
          <h1>{t('home.wikiTitle')}</h1>
        </div>
        <div className="w-list container">
          <span className="line">
            <img src={themeImage('icons/line.png')} alt="" />
          </span>
          <div className="wiki">
            <div>
              <span>
                {t('home.wikiGuides')}
                <Link to="/wiki" aria-label={t('home.wikiOpen')}>
                  <img src={themeImage('icons/more.png')} alt="" />
                </Link>
              </span>
              <ul>
                {wikiItems.map((item) => (
                  <li key={`${item.to}-${item.label}`}>
                    <Link to={item.to}>
                      <span />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {updateCards.map((item) => (
            <Link key={`${item.to}-${item.title}`} to={item.to} className="update">
              <div style={{ background: `url(${themeImage(item.image)}) center / cover no-repeat` }}>
                <div>
                  <span>{item.kicker}</span>
                  <p>{item.title}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-clans" id="top-clans" style={sectionArt('home/clans-v2.webp')}>
        <div className="title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            {t('home.clansKicker')}
          </span>
          <h1>{t('home.clansTitle')}</h1>
        </div>

        {clans.isLoading ? (
          <div className="home-empty container">
            <span className="home-crest" aria-hidden="true">
              <i className="fa-solid fa-shield-halved" />
            </span>
            <p>{t('home.clansLoading')}</p>
          </div>
        ) : clans.data?.length ? (
          <>
            <div className="clan-podium container">
              {clans.data.slice(0, 3).map((clan, index) => (
                <article className={`clan-card place-${index + 1}`} key={`${clan.position}-${clan.name}`}>
                  <div className="clan-card-inner">
                    <span className="clan-place">
                      {index === 0 ? <i className="fa-solid fa-crown" /> : null}
                      {t('home.clansPlace', { n: clan.position })}
                    </span>
                    <span className="home-crest" aria-hidden="true">
                      <span>{clanInitial(clan.name)}</span>
                    </span>
                    <h3>{clan.name}</h3>
                    <strong>{formatScore(clan.value)}</strong>
                    <em>{t('home.clansReputation')}</em>
                  </div>
                </article>
              ))}
            </div>
            {clans.data.length > 3 ? (
              <ol className="clan-board container">
                {clans.data.slice(3, 8).map((clan) => (
                  <li key={`${clan.position}-${clan.name}`}>
                    <span className="clan-board-rank">{clan.position}</span>
                    <span className="home-crest sm" aria-hidden="true">
                      <span>{clanInitial(clan.name)}</span>
                    </span>
                    <span className="clan-board-name">{clan.name}</span>
                    <span className="clan-board-score">{formatScore(clan.value)}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="home-more container">
              <Link to="/rankings?tab=clans">
                {t('home.clansFullRanking')}
                <img src={themeImage('icons/more.png')} alt="" />
              </Link>
            </div>
          </>
        ) : (
          <div className="home-empty container">
            <span className="home-crest" aria-hidden="true">
              <i className="fa-solid fa-shield-halved" />
            </span>
            <p>{t('home.clansEmpty')}</p>
            <Link to="/rankings?tab=clans">{t('home.clansSeeRankings')}</Link>
          </div>
        )}
      </section>

      <section className="home-rankings" style={sectionArt('home/rankings-v2.webp')}>
        <div className="title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            {t('home.rankingsKicker')}
          </span>
          <h1>{t('home.rankingsTitle')}</h1>
        </div>

        <div className="ranking-tiles container">
          {rankingLinks.map((item) => (
            <Link className="ranking-tile" key={item.to} to={item.to}>
              <span className="ranking-tile-inner">
                <i className={`fa-solid ${item.icon}`} />
                <strong>{item.label}</strong>
              </span>
            </Link>
          ))}
        </div>

        <div className="server-plaque container">
          <div>
            <strong>{status.data?.players_online ?? 0}</strong>
            <span>{t('home.statOnline')}</span>
          </div>
          <div>
            <strong>{clans.data?.length ?? 0}</strong>
            <span>{t('home.statClans')}</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>{t('home.statUptime')}</span>
          </div>
          <div>
            <strong className={status.data?.game_online ? 'is-online' : 'is-offline'}>
              <i className="fas fa-circle" />
              {status.data?.game_online ? t('home.statOnline') : t('home.statOffline')}
            </strong>
            <span>{t('home.statServer')}</span>
          </div>
        </div>

        <div className="home-cta container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            {t('home.ctaKicker')}
          </span>
          <p>{t('home.ctaBlurb')}</p>
          <div className="home-cta-links">
            <Link to="/downloads">{t('home.downloadShort')}</Link>
            <Link to="/register">{t('home.createAccount')}</Link>
          </div>
        </div>
      </section>

      <div className="apoiadores-banner" aria-hidden="true">
        <div className="banner-track">
          {Array.from({ length: 16 }, (_, index) => (
            <span key={index}>{t('home.supporters')}</span>
          ))}
        </div>
      </div>

      <section className="trailer-section" style={sectionArt('home/cinematic-v2.webp')}>
        <div className="title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            {t('home.trailerKicker')}
          </span>
          <h1>{t('home.trailerTitle')}</h1>
        </div>
        <div className="trailer-frame container">
          <div className="trailer-frame-inner">
            {trailerPlaying ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1`}
                title={t('home.trailerIframe')}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button
                type="button"
                className="trailer-facade"
                onClick={() => setTrailerPlaying(true)}
                aria-label={t('home.trailerPlay')}
              >
                <img
                  src={`https://i.ytimg.com/vi/${trailerId}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <span className="trailer-facade-play" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <p className="trailer-description">{t('home.trailerBlurb')}</p>
      </section>

      {discord ? (
        <section className="c">
          <div className="c-title title container">
            <span>
              <img src={themeImage('icons/text.png')} alt="" />
              {t('home.communityKicker')}
            </span>
            <h1>
              <Trans i18nKey="home.communityTitle" ns="public" components={{ strong: <strong /> }} />
            </h1>
          </div>
          <div className="c-link">
            <a href={discord} target="_blank" rel="noreferrer">
              <i className="fa-brands fa-discord" />
            </a>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export function HomePage() {
  const theme = useTheme()
  if (theme.presentation?.renderer === 'portal-v1') {
    return <PortalHomePage presentation={theme.presentation} />
  }
  return <DefaultHomePage />
}
