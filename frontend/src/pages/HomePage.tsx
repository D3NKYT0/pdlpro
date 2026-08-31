import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contentApi, serverApi } from '../services/api'

export function HomePage() {
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const news = useQuery({ queryKey: ['news'], queryFn: contentApi.news })

  return (
    <div className="grid">
      <section className="hero card">
        <h1>Painel Definitivo Lineage 2.0</h1>
        <p className="muted">
          Front e API separados, arquitetura limpa e injeção de dependência. O backend só fala JSON.
        </p>
        <p>
          <Link className="btn" to="/register">
            Criar conta
          </Link>
        </p>
      </section>
      <section className="grid cols-3">
        <article className="card">
          <div className="muted">Game server</div>
          <div className={status.data?.game_online ? 'badge' : 'badge off'}>
            {status.data?.game_online ? 'Online' : 'Offline'}
          </div>
        </article>
        <article className="card">
          <div className="muted">Login server</div>
          <div className={status.data?.login_online ? 'badge' : 'badge off'}>
            {status.data?.login_online ? 'Online' : 'Offline'}
          </div>
        </article>
        <article className="card">
          <div className="muted">Jogadores</div>
          <div className="stat">{status.data?.players_online ?? 0}</div>
        </article>
      </section>
      <section className="card">
        <h2>Notícias</h2>
        {(news.data ?? []).slice(0, 5).map((item) => (
          <p key={item.id}>
            <Link to={`/news/${item.slug}`}>{item.title}</Link>
            <span className="muted"> — {item.excerpt}</span>
          </p>
        ))}
        {!news.data?.length && <p className="muted">Nenhuma notícia publicada ainda.</p>}
      </section>
    </div>
  )
}
