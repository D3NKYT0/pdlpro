import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { contentApi, serverApi } from '../services/api'
import { themeImage } from '../theme/assets'
import { useTheme } from '../theme/ThemeProvider'
import { PortalHomePage } from '../components/themes/PortalTheme'
import { PdlHeroEmblem } from '../components/PdlSymbol'
import { ComingSoonPage } from './ComingSoonPage'

const wikiLinks = [
  { to: '/informacoes#rates', label: 'Rates e progressão' },
  { to: '/informacoes#enchant', label: 'Encantamento' },
  { to: '/informacoes#pvp', label: 'Siege e castelos' },
  { to: '/informacoes#comecar', label: 'Primeiros passos' },
  { to: '/faq', label: 'Perguntas frequentes' },
]

const chronicleCards = [
  {
    to: '/news',
    image: 'home/archive-v2.webp',
    kicker: 'Crônica',
    title: 'Notícias do reino',
  },
  {
    to: '/roadmap',
    image: 'home/cinematic-v2.webp',
    kicker: 'Temporada',
    title: 'Roadmap e próximos passos',
  },
]

const rankingLinks = [
  { to: '/rankings?tab=pvp', label: 'PvP', icon: 'fa-khanda' },
  { to: '/rankings?tab=pk', label: 'PK', icon: 'fa-skull' },
  { to: '/rankings?tab=adena', label: 'Adena', icon: 'fa-coins' },
  { to: '/rankings?tab=clans', label: 'Clãs', icon: 'fa-shield-halved' },
  { to: '/rankings?tab=level', label: 'Nível', icon: 'fa-star' },
  { to: '/rankings?tab=olympiad', label: 'Olimpíada', icon: 'fa-trophy' },
]

function formatScore(value: number) {
  return value.toLocaleString('pt-BR')
}

function clanInitial(name: string) {
  return (name.trim()[0] || '?').toUpperCase()
}

const features = [
  {
    to: '/informacoes#rates',
    image: 'home/chronicle-rates-v2.webp',
    title: 'Crônica e Rates',
    blurb: 'Progressão, economia e o ritmo do reino',
  },
  {
    to: '/informacoes#pvp',
    image: 'home/castle-siege-v2.webp',
    title: 'Guerra de Castelos',
    blurb: 'Siege, clãs e o domínio de Aden',
  },
  {
    to: '/rankings',
    image: 'home/hall-of-fame-v2.webp',
    title: 'Hall da Fama',
    blurb: 'PvP, olimpíada e os melhores clãs',
  },
]

function sectionArt(image: string) {
  return { '--section-art': `url(${themeImage(image)})` } as CSSProperties
}

function DefaultHomePage() {
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const news = useQuery({ queryKey: ['news'], queryFn: contentApi.news })
  const wiki = useQuery({ queryKey: ['wiki'], queryFn: () => contentApi.wiki() })
  const clans = useQuery({ queryKey: ['rankings', 'clans'], queryFn: () => serverApi.rankings('clans') })
  const discord = import.meta.env.VITE_DISCORD_URL as string | undefined
  const trailerId = (import.meta.env.VITE_TRAILER_YOUTUBE_ID as string | undefined) || 'Mm19W1PKMFQ'
  const [trailerPlaying, setTrailerPlaying] = useState(false)
  const serverName = (import.meta.env.VITE_SERVER_NAME as string | undefined) || 'Inicie sua Jornada em Lineage Agora!'
  const serverDescription =
    (import.meta.env.VITE_SERVER_DESCRIPTION as string | undefined) || 'Onde Lendas Nascem, Heróis Lutam e a Glória é Eterna.'
  const wikiItems = wiki.data?.length
    ? wiki.data.slice(0, 5).map((page) => ({ to: `/wiki/${page.slug}`, label: page.title }))
    : wikiLinks
  const updateCards = (news.data ?? []).length
    ? (news.data ?? []).slice(0, 2).map((item, index) => ({
        to: `/news/${item.slug}`,
        image: chronicleCards[index % chronicleCards.length].image,
        kicker: 'Atualização',
        title: item.title,
      }))
    : chronicleCards

  return (
    <>
      <div className="video">
        <video autoPlay muted loop playsInline src={themeImage('video.mp4')} onError={(event) => event.currentTarget.remove()} />
      </div>

      <section className="h">
        <div className="h-logo"><PdlHeroEmblem /></div>
        <h1>{serverName}</h1>
        <p className="hero-description">"{serverDescription}"</p>
        <div className="h-link">
          <Link to="/downloads">Baixe o Jogo</Link>
          <Link to="/register">Crie sua conta mestra</Link>
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
            No mundo de Aden
          </span>
          <h1>Crônica, castelos e a glória que definem o Lineage</h1>
        </div>
        <div className="character" aria-hidden="true">
          <img src={themeImage('home/aden-guardian-v2.webp')} alt="" />
        </div>
        <div className="f-list container">
          {features.map((item, index) => (
            <Link className={`f${index + 1}`} key={item.title} to={item.to}>
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
            Arquivos do reino
          </span>
          <h1>Guias, crônica e o que move Aden</h1>
        </div>
        <div className="w-list container">
          <span className="line">
            <img src={themeImage('icons/line.png')} alt="" />
          </span>
          <div className="wiki">
            <div>
              <span>
                Guias
                <Link to="/wiki" aria-label="Abrir wiki completa">
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
            Melhores Clãs
          </span>
          <h1>Os clãs que dominam o reino</h1>
        </div>

        {clans.isLoading ? (
          <div className="home-empty container">
            <span className="home-crest" aria-hidden="true">
              <i className="fa-solid fa-shield-halved" />
            </span>
            <p>Consultando o hall da fama...</p>
          </div>
        ) : clans.data?.length ? (
          <>
            <div className="clan-podium container">
              {clans.data.slice(0, 3).map((clan, index) => (
                <article className={`clan-card place-${index + 1}`} key={`${clan.position}-${clan.name}`}>
                  <div className="clan-card-inner">
                    <span className="clan-place">
                      {index === 0 ? <i className="fa-solid fa-crown" /> : null}
                      {clan.position}º
                    </span>
                    <span className="home-crest" aria-hidden="true">
                      <span>{clanInitial(clan.name)}</span>
                    </span>
                    <h3>{clan.name}</h3>
                    <strong>{formatScore(clan.value)}</strong>
                    <em>Reputação</em>
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
                Ver ranking completo
                <img src={themeImage('icons/more.png')} alt="" />
              </Link>
            </div>
          </>
        ) : (
          <div className="home-empty container">
            <span className="home-crest" aria-hidden="true">
              <i className="fa-solid fa-shield-halved" />
            </span>
            <p>O hall da fama ainda aguarda o primeiro clã.</p>
            <Link to="/rankings?tab=clans">Ver rankings</Link>
          </div>
        )}
      </section>

      <section className="home-rankings" style={sectionArt('home/rankings-v2.webp')}>
        <div className="title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            Rankings do Servidor
          </span>
          <h1>Prove seu valor no campo de batalha</h1>
        </div>

        <div className="ranking-tiles container">
          {rankingLinks.map((item) => (
            <Link className="ranking-tile" key={item.label} to={item.to}>
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
            <span>Online</span>
          </div>
          <div>
            <strong>{clans.data?.length ?? 0}</strong>
            <span>Clãs</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>Uptime</span>
          </div>
          <div>
            <strong className={status.data?.game_online ? 'is-online' : 'is-offline'}>
              <i className="fas fa-circle" />
              {status.data?.game_online ? 'Online' : 'Offline'}
            </strong>
            <span>Servidor</span>
          </div>
        </div>

        <div className="home-cta container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            Seja o melhor
          </span>
          <p>Entre para a competição e mostre suas habilidades no nosso servidor.</p>
          <div className="home-cta-links">
            <Link to="/downloads">Baixar Jogo</Link>
            <Link to="/register">Criar Conta</Link>
          </div>
        </div>
      </section>

      <div className="apoiadores-banner" aria-hidden="true">
        <div className="banner-track">
          {Array.from({ length: 16 }, (_, index) => (
            <span key={index}>Apoiadores</span>
          ))}
        </div>
      </div>

      <section className="trailer-section" style={sectionArt('home/cinematic-v2.webp')}>
        <div className="title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            Cinematic
          </span>
          <h1>Trailer Oficial</h1>
        </div>
        <div className="trailer-frame container">
          <div className="trailer-frame-inner">
            {trailerPlaying ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1`}
                title="Trailer oficial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button
                type="button"
                className="trailer-facade"
                onClick={() => setTrailerPlaying(true)}
                aria-label="Reproduzir trailer oficial"
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
        <p className="trailer-description">Assista ao trailer e mergulhe no mundo épico do nosso servidor.</p>
      </section>

      {discord ? (
        <section className="c">
          <div className="c-title title container">
            <span>
              <img src={themeImage('icons/text.png')} alt="" />
              Faça parte da nossa comunidade
            </span>
            <h1>
              Junte-se à nossa <strong>comunidade</strong> e fique por dentro
            </h1>
          </div>
          <div className="c-link">
            <a href={discord} target="_blank" rel="noreferrer">
              <i className="fa-brands fa-discord" />
            </a>
          </div>
        </section>
      ) : null}
    </>
  )
}

export function HomePage() {
  const theme = useTheme()
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  const comingSoon = Boolean(info.data?.coming_soon)

  if (info.isPending) {
    return null
  }

  if (theme.presentation?.renderer === 'portal-v1') {
    return <PortalHomePage presentation={theme.presentation} comingSoon={comingSoon} />
  }
  if (comingSoon) {
    return <ComingSoonPage info={info.data} />
  }
  return <DefaultHomePage />
}
