import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contentApi } from '../services/api'

export function NewsPage() {
  const news = useQuery({ queryKey: ['news'], queryFn: contentApi.news })

  return (
    <div className="news-container">
      <div className="container">
        <div className="news-header">
          <h1 className="news-title">
            <i className="fas fa-newspaper me-3" /> Notícias Recentes
          </h1>
          <p className="news-subtitle">Fique por dentro das últimas novidades e atualizações da nossa comunidade.</p>
        </div>
        {(news.data ?? []).length ? (
          <div className="news-grid">
            {(news.data ?? []).map((item) => (
              <div className="news-card" key={item.id}>
                <div className="news-image-container">
                  <div className="news-image-placeholder">
                    <i className="fas fa-newspaper" />
                  </div>
                </div>
                <div className="news-content">
                  <h3 className="news-card-title">{item.title}</h3>
                  <p className="news-card-summary">{item.excerpt}</p>
                  <div className="news-meta">
                    <div className="news-date">
                      <i className="fas fa-calendar" />
                      <span>{item.published_at ? new Date(item.published_at).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                  <div className="news-actions">
                    <Link to={`/news/${item.slug}`} className="news-btn news-btn-primary">
                      <i className="fas fa-arrow-right" /> Leia mais
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="news-empty">
            <i className="fas fa-newspaper news-empty-icon" />
            <h3>Nenhuma notícia disponível</h3>
            <p>Não há notícias disponíveis no momento. Volte em breve para novidades!</p>
          </div>
        )}
      </div>
    </div>
  )
}
