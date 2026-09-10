import { Card } from '../components/ui/Card'
import { RichTextContent } from '../components/ui/RichText'
import { plainTextFromRichText } from '../lib/rich-text'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flag, CalendarDays, ArrowLeft, ArrowUpRight } from 'lucide-react'
import { programsApi } from '../services/api'
import { contentLang, INTL_LOCALES } from '../i18n/locale'
import {
  Empty,
  ErrorNotice,
  Loading,
  Meter,
  Status,
} from '../components/programs/ProgramUI'

function roadmapPreview(description: string, limit = 170): string {
  const text = plainTextFromRichText(description)
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

export function RoadmapPage() {
  const { t, i18n } = useTranslation('public')
  const language = contentLang(i18n.language)
  const query = useQuery({
    queryKey: ['roadmap'],
    queryFn: () => programsApi.roadmap(),
  })

  const formatDate = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString(INTL_LOCALES[language])

  return (
    <div className="program-page program-public">
      <Card as="header" className="program-hero">
        <div>
          <span className="panel-eyebrow">{t('roadmap.eyebrow')}</span>
          <h1>{t('roadmap.title')}</h1>
          <p>{t('roadmap.lead')}</p>
        </div>
        <Flag />
      </Card>
      <ErrorNotice error={query.error} />
      {query.isPending && <Loading />}
      <div className="program-grid">
        {(['planned', 'progress', 'completed'] as const).map((status) => {
          const count = query.data?.filter((e) => e.status === status).length || 0
          return (
            <Card className="program-section" key={status}>
              <div className="program-section-heading">
                <Status value={status} label={t(`roadmap.status.${status}`)} />
                <small className="muted">
                  {count} {count === 1 ? t('roadmap.updateOne') : t('roadmap.updateMany')}
                </small>
              </div>
              {query.data
                ?.filter((e) => e.status === status)
                .map((entry) => (
                  <article className="program-item" key={entry.id}>
                    <span className="panel-eyebrow">{entry.category}</span>
                    <h2>{entry.title}</h2>
                    <p>{roadmapPreview(entry.description)}</p>
                    <Meter value={entry.progress} max={100} />
                    <small>
                      {t('roadmap.progressDone', { pct: entry.progress })}
                      {entry.target_date
                        ? ` · ${t('roadmap.forecast', { date: formatDate(entry.target_date) })}`
                        : ''}
                    </small>
                    <Link to={`/roadmap/${entry.id}`} className="character-back">
                      {t('roadmap.viewUpdate')} <ArrowUpRight size={16} />
                    </Link>
                  </article>
                ))}
              {query.data && !query.data.some((e) => e.status === status) && (
                <Empty>{t('roadmap.emptyStage')}</Empty>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function RoadmapDetailPage() {
  const { t, i18n } = useTranslation('public')
  const language = contentLang(i18n.language)
  const { id = '' } = useParams()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])
  const query = useQuery({
    queryKey: ['roadmap', id],
    queryFn: () => programsApi.roadmapDetail(id),
  })
  const entry = query.data
  return (
    <div className="program-page program-public">
      <Link to="/roadmap" className="character-back">
        <ArrowLeft />
        {t('roadmap.back')}
      </Link>
      <ErrorNotice error={query.error} />
      {query.isPending && <Loading />}
      {entry && (
        <Card as="article" className="program-section">
          <div className="program-section-heading">
            <span className="panel-eyebrow">{entry.category}</span>
            <Status value={entry.status} label={t(`roadmap.status.${entry.status}`, { defaultValue: entry.status })} />
          </div>
          <h1>{entry.title}</h1>
          <Meter value={entry.progress} max={100} />
          <small className="muted">{t('roadmap.progressDone', { pct: entry.progress })}</small>
          <RichTextContent html={entry.description} />
          {entry.target_date && (
            <p className="muted">
              <CalendarDays size={17} /> {t('roadmap.forecastLabel')}{' '}
              {new Date(`${entry.target_date}T12:00:00`).toLocaleDateString(INTL_LOCALES[language])}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
