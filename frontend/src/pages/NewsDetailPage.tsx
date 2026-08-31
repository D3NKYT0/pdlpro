import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { contentApi } from '../services/api'

export function NewsDetailPage() {
  const { slug = '' } = useParams()
  const news = useQuery({ queryKey: ['news', slug], queryFn: () => contentApi.newsDetail(slug), enabled: Boolean(slug) })

  if (!news.data) {
    return (
      <div className="news-detail-container">
        <div className="container">
          <p className="news-subtitle">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="news-detail-container">
      <div className="container">
        <div className="news-detail-card">
          <div className="news-detail-header">
            <h1 className="news-detail-title">{news.data.title}</h1>
            <div className="news-detail-meta">
              <div className="news-meta-item">
                <i className="fas fa-calendar" />
                <span>{news.data.published_at ? new Date(news.data.published_at).toLocaleString() : ''}</span>
              </div>
              <div className="news-meta-item">
                <i className="fas fa-newspaper" />
                <span>Notícia</span>
              </div>
            </div>
          </div>
          <div className="news-detail-body">
            <div className="news-detail-content">{news.data.body}</div>
            <div className="text-center">
              <Link to="/news" className="news-back-button">
                <i className="fas fa-arrow-left" /> Voltar às Notícias
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
