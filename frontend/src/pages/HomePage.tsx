import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contentApi, serverApi } from '../services/api'
import { themeImage } from '../theme/assets'
import { useTheme } from '../theme/ThemeProvider'
import { PortalHomePage } from '../components/themes/PortalTheme'

const wikiLinks = [
  { to: '/wiki', label: 'Guias do jogo' },
  { to: '/wiki', label: 'Comandos' },
  { to: '/wiki', label: 'Classes e raças' },
  { to: '/faq', label: 'Ajuda no Jogo' },
  { to: '/calendar', label: 'Guia de Eventos' },
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
  { to: '/informacoes#pvp', image: 'features/1.jpg', title: 'PvP e Castelos' },
  { to: '/informacoes#features', image: 'features/2.jpg', title: 'Missões Personalizadas' },
  { to: '/calendar', image: 'features/3.jpg', title: 'Eventos e Recompensas' },
]

function DefaultHomePage() {
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const news = useQuery({ queryKey: ['news'], queryFn: contentApi.news })
  const wiki = useQuery({ queryKey: ['wiki'], queryFn: () => contentApi.wiki() })
  const clans = useQuery({ queryKey: ['rankings', 'clans'], queryFn: () => serverApi.rankings('clans') })
  const discord = import.meta.env.VITE_DISCORD_URL as string | undefined
  const trailerId = (import.meta.env.VITE_TRAILER_YOUTUBE_ID as string | undefined) || 'Mm19W1PKMFQ'
  const serverName = (import.meta.env.VITE_SERVER_NAME as string | undefined) || 'Inicie sua Jornada em Lineage Agora!'
  const serverDescription =
    (import.meta.env.VITE_SERVER_DESCRIPTION as string | undefined) || 'Onde Lendas Nascem, Heróis Lutam e a Glória é Eterna.'
  const wikiItems = wiki.data?.length
    ? wiki.data.slice(0, 5).map((page) => ({ to: `/wiki/${page.slug}`, label: page.title }))
    : wikiLinks

  return (
    <>
      <div className="video">
        <video autoPlay muted loop playsInline src={themeImage('video.mp4')} onError={(event) => event.currentTarget.remove()} />
      </div>

      <section className="h">
        <div className="h-logo">
          <img className="letters" src={themeImage('logo.png')} alt="PDL" />
          <img className="circle" src={themeImage('logo-circle.png')} alt="" />
        </div>
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

      <section className="f" id="features">
        <div className="f-title title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            Aproveite o melhor do Lineage
          </span>
          <h1>O servidor mais atualizado, moderno e estável para jogar Lineage</h1>
        </div>
        <div className="f-list container">
          {features.map((item, index) => (
            <Link className={`f${index + 1}`} key={item.title} to={item.to}>
              <div style={{ background: `url(${themeImage(item.image)}) top / cover no-repeat` }}>
                <span>
                  <p>{item.title}</p>
                  <img src={themeImage('features/icon.png')} alt="" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="character">
          <img src={themeImage('features/character.png')} alt="" />
        </div>
      </section>

      <section className="w">
        <div className="w-title title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            Wiki
          </span>
          <h1>Wiki e Atualizações do Lineage</h1>
        </div>
        <div className="w-list container">
          <span className="line">
            <img src={themeImage('icons/line.png')} alt="" />
          </span>
          <div className="wiki">
            <div>
              <span>
                Wiki
                <Link to="/wiki">
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
          {(news.data ?? []).slice(0, 2).map((item) => (
            <Link key={item.id} to={`/news/${item.slug}`} className="update">
              <div style={{ background: `url(${themeImage('bg/3.jpg')}) top / cover no-repeat` }}>
                <div>
                  <span>Atualização</span>
                  <p>{item.title}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-clans" id="top-clans">
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

      <section className="home-rankings">
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

      <section className="trailer-section">
        <div className="title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            Cinematic
          </span>
          <h1>Trailer Oficial</h1>
        </div>
        <div className="trailer-frame container">
          <div className="trailer-frame-inner">
            <iframe
              src={`https://www.youtube.com/embed/${trailerId}`}
              title="Trailer oficial"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
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
  if (theme.presentation?.renderer === 'portal-v1') {
    return <PortalHomePage presentation={theme.presentation} />
  }
  return <DefaultHomePage />
}
