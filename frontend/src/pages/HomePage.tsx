import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contentApi, serverApi } from '../services/api'

const features = [
  { to: '/wiki', title: 'PvP e Castelos', text: 'Guerras, sieges e o combate que define o servidor.' },
  { to: '/wiki', title: 'Missões e rates', text: 'O que muda no gameplay e como evoluir mais rápido.' },
  { to: '/calendar', title: 'Eventos e recompensas', text: 'Agenda de eventos, bônus e datas importantes.' },
]

const rankingLinks = [
  { kind: 'pvp', label: 'Ranking PvP' },
  { kind: 'pk', label: 'Ranking PK' },
  { kind: 'clans', label: 'Ranking Clãs' },
  { kind: 'level', label: 'Ranking Nível' },
  { kind: 'adena', label: 'Ranking Adena' },
  { kind: 'online', label: 'Ranking Online' },
]

export function HomePage() {
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const news = useQuery({ queryKey: ['news'], queryFn: contentApi.news })
  const wiki = useQuery({ queryKey: ['wiki'], queryFn: () => contentApi.wiki() })
  const pvp = useQuery({ queryKey: ['rankings', 'pvp'], queryFn: () => serverApi.rankings('pvp') })
  const discord = import.meta.env.VITE_DISCORD_URL as string | undefined

  return (
    <div className="public-home">
      <ThemeVideo />
      <section className="public-hero">
        <p className="public-kicker">PDL PRO</p>
        <h1>Inicie sua jornada em Lineage agora</h1>
        <p className="public-lead">Onde lendas nascem, heróis lutam e a glória é eterna.</p>
        <div className="public-hero-status">
          <span className={status.data?.game_online ? 'is-on' : 'is-off'}>
            Game {status.data?.game_online ? 'online' : 'offline'}
          </span>
          <span className={status.data?.login_online ? 'is-on' : 'is-off'}>
            Login {status.data?.login_online ? 'online' : 'offline'}
          </span>
          <span>{status.data?.players_online ?? 0} jogadores</span>
        </div>
        <div className="public-hero-actions">
          <Link className="btn" to="/downloads">
            Baixe o jogo
          </Link>
          <Link className="btn ghost" to="/register">
            Crie sua conta mestra
          </Link>
        </div>
      </section>

      <section className="public-section">
        <header className="public-section-title">
          <span>Aproveite o melhor do Lineage</span>
          <h2>Servidor atualizado, moderno e estável</h2>
        </header>
        <div className="public-features">
          {features.map((item) => (
            <Link className="public-feature" key={item.title} to={item.to}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="public-section">
        <header className="public-section-title">
          <span>Wiki</span>
          <h2>Informações e atualizações</h2>
        </header>
        <div className="public-split">
          <article className="public-card">
            <h3>
              Wiki <Link to="/wiki">ver tudo</Link>
            </h3>
            <ul>
              {(wiki.data ?? []).slice(0, 5).map((page) => (
                <li key={page.id}>
                  <Link to={`/wiki/${page.slug}`}>{page.title}</Link>
                </li>
              ))}
              {!wiki.data?.length && <li className="muted">Nenhuma página publicada ainda.</li>}
            </ul>
          </article>
          <article className="public-card">
            <h3>Comece por aqui</h3>
            <ul>
              <li>
                <Link to="/wiki">Informações gerais</Link>
              </li>
              <li>
                <Link to="/faq">Perguntas frequentes</Link>
              </li>
              <li>
                <Link to="/downloads">Cliente e patches</Link>
              </li>
              <li>
                <Link to="/calendar">Calendário de eventos</Link>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="public-section public-section-dark">
        <header className="public-section-title">
          <span>Competição</span>
          <h2>Rankings do servidor</h2>
        </header>
        <div className="public-split">
          <article className="public-card">
            <h3>
              Top PvP <Link to="/rankings">ver rankings</Link>
            </h3>
            <ol className="public-rank-list">
              {(pvp.data ?? []).slice(0, 5).map((row) => (
                <li key={`${row.position}-${row.name}`}>
                  <strong>{row.position}.</strong> {row.name} <span>{row.value}</span>
                </li>
              ))}
              {!pvp.data?.length && <li className="muted">Ranking vazio enquanto o banco do jogo estiver desligado.</li>}
            </ol>
            <ul className="public-rank-links">
              {rankingLinks.map((item) => (
                <li key={item.kind}>
                  <Link to="/rankings">{item.label}</Link>
                </li>
              ))}
            </ul>
          </article>
          <div className="public-stats-col">
            <article className="public-card">
              <h3>Estatísticas</h3>
              <div className="public-stats">
                <div>
                  <strong>{status.data?.players_online ?? 0}</strong>
                  <span>Online</span>
                </div>
                <div>
                  <strong>24/7</strong>
                  <span>Uptime</span>
                </div>
                <div>
                  <strong className={status.data?.game_online ? 'is-on' : 'is-off'}>
                    {status.data?.game_online ? 'Online' : 'Offline'}
                  </strong>
                  <span>Servidor</span>
                </div>
                <div>
                  <strong className={status.data?.login_online ? 'is-on' : 'is-off'}>
                    {status.data?.login_online ? 'Online' : 'Offline'}
                  </strong>
                  <span>Login</span>
                </div>
              </div>
            </article>
            <article className="public-card">
              <h3>Seja o melhor</h3>
              <p>Entre na competição e mostre suas habilidades no servidor.</p>
              <div className="public-hero-actions">
                <Link className="btn" to="/register">
                  Criar conta
                </Link>
                <Link className="btn ghost" to="/downloads">
                  Baixar jogo
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="public-section">
        <header className="public-section-title">
          <span>Comunidade</span>
          <h2>Últimas notícias</h2>
        </header>
        <div className="public-news">
          {(news.data ?? []).slice(0, 3).map((item) => (
            <article className="public-card" key={item.id}>
              <h3>
                <Link to={`/news/${item.slug}`}>{item.title}</Link>
              </h3>
              <p className="muted">{item.excerpt}</p>
            </article>
          ))}
          {!news.data?.length && <p className="muted">Nenhuma notícia publicada ainda.</p>}
        </div>
        <p>
          <Link to="/news">Todas as notícias</Link>
        </p>
      </section>

      {discord ? (
        <section className="public-section public-community">
          <header className="public-section-title">
            <span>Junte-se a nós</span>
            <h2>Faça parte da comunidade</h2>
          </header>
          <a className="btn" href={discord} target="_blank" rel="noreferrer">
            Discord
          </a>
        </section>
      ) : null}
    </div>
  )
}

function ThemeVideo() {
  return (
    <video className="public-video" autoPlay muted loop playsInline src="/theme/video.mp4" onError={(event) => {
      event.currentTarget.remove()
    }} />
  )
}
