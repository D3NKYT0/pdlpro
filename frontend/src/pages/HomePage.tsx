import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contentApi, serverApi } from '../services/api'
import { themeImage } from '../theme/assets'

const wikiLinks = [
  { to: '/wiki', label: 'Guias do jogo' },
  { to: '/wiki', label: 'Comandos' },
  { to: '/wiki', label: 'Classes e raças' },
  { to: '/faq', label: 'Ajuda no Jogo' },
  { to: '/calendar', label: 'Guia de Eventos' },
]

const rankingLinks = [
  { to: '/rankings', label: 'Ranking PvP' },
  { to: '/rankings', label: 'Ranking PK' },
  { to: '/rankings', label: 'Ranking Adena' },
  { to: '/rankings', label: 'Ranking Clãs' },
  { to: '/rankings', label: 'Ranking Nível' },
  { to: '/rankings', label: 'Ranking Olimpíada' },
]

const features = [
  { to: '/informacoes#pvp', image: 'features/1.jpg', title: 'PvP e Castelos' },
  { to: '/informacoes#features', image: 'features/2.jpg', title: 'Missões Personalizadas' },
  { to: '/calendar', image: 'features/3.jpg', title: 'Eventos e Recompensas' },
]

export function HomePage() {
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

      <section className="clans" id="top-clans">
        <div className="clans-title title container">
          <span>
            <img src={themeImage('icons/text.png')} alt="" />
            Melhores Clãs
          </span>
        </div>
        <div className="clans-table container">
          <div className="table-header">
            <div className="col-rank">#</div>
            <div className="col-crest">Cresta</div>
            <div className="col-name">Nome do Clã</div>
            <div className="col-level">Nível</div>
            <div className="col-reputation">Reputação</div>
            <div className="col-alliance">Aliança</div>
            <div className="col-leader">Líder</div>
            <div className="col-members">Membros</div>
          </div>
          <div className="table-body">
            {(clans.data ?? []).slice(0, 8).map((clan, index) => (
              <div className={`table-row${index === 0 ? ' first-place' : ''}`} key={`${clan.position}-${clan.name}`}>
                <div className="col-rank">{index === 0 ? <span className="rank-icon">👑</span> : clan.position}</div>
                <div className="col-crest">
                  <div className="crest-container" />
                </div>
                <div className="col-name">{clan.name}</div>
                <div className="col-level">—</div>
                <div className="col-reputation">{clan.value}</div>
                <div className="col-alliance">—</div>
                <div className="col-leader">—</div>
                <div className="col-members">—</div>
              </div>
            ))}
            {!clans.data?.length ? (
              <div className="table-row">
                <div className="col-name">Nenhum clã ranqueado no momento.</div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="tops-section">
        <div className="tops-title title container">
          <h1>Rankings do Servidor</h1>
        </div>
        <div className="tops-content container">
          <span className="line">
            <img src={themeImage('icons/line.png')} alt="" />
          </span>
          <div className="tops-grid">
            <div className="tops-column">
              <div className="tops">
                <div>
                  <span>
                    Rankings
                    <Link to="/rankings">
                      <img src={themeImage('icons/more.png')} alt="" />
                    </Link>
                  </span>
                  <ul>
                    {rankingLinks.map((item) => (
                      <li key={item.label}>
                        <Link to={item.to}>
                          <span />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="tops-info-column">
              <div className="stats-card">
                <h3>
                  <i className="fas fa-chart-line" /> Estatísticas
                </h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-number">{status.data?.players_online ?? 0}</div>
                    <div className="stat-label">Online</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{clans.data?.length ?? 0}</div>
                    <div className="stat-label">Clãs</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">24/7</div>
                    <div className="stat-label">Uptime</div>
                  </div>
                  <div className="stat-item">
                    <div className={`stat-number ${status.data?.game_online ? 'online' : 'offline'}`}>
                      <i className="fas fa-circle" /> {status.data?.game_online ? 'Online' : 'Offline'}
                    </div>
                    <div className="stat-label">Servidor</div>
                  </div>
                </div>
              </div>
              <div className="cta-card">
                <h3>
                  <i className="fas fa-star" /> Seja o Melhor!
                </h3>
                <p>Entre para a competição e mostre suas habilidades no nosso servidor!</p>
                <div className="cta-buttons">
                  <Link to="/register" className="theme-btn-gold">
                    Criar Conta
                  </Link>
                  <Link to="/downloads" className="theme-btn-outline">
                    Baixar Jogo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="apoiadores-banner">
        <div className="banner-track">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index}>APOIADORES</span>
          ))}
        </div>
      </div>

      <section className="trailer-section">
        <div className="container text-center">
          <h2 className="trailer-title">🎬 Trailer Oficial</h2>
          <div className="video-wrapper">
            <div className="video-overlay" />
            <iframe
              src={`https://www.youtube.com/embed/${trailerId}`}
              title="Trailer oficial"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="trailer-description">Assista ao trailer e mergulhe no mundo épico do nosso servidor!</p>
        </div>
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
