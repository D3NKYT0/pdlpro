import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { contentApi } from '../services/api'
import { contentLang, INTL_LOCALES } from '../i18n/locale'

export function CalendarPage() {
  const { t, i18n } = useTranslation('public')
  const language = contentLang(i18n.language)
  const events = useQuery({ queryKey: ['calendar'], queryFn: contentApi.calendar })

  const formatRange = (startsAt: string, endsAt: string) =>
    t('calendar.range', {
      start: new Date(startsAt).toLocaleString(INTL_LOCALES[language]),
      end: new Date(endsAt).toLocaleString(INTL_LOCALES[language]),
    })

  return (
    <div className="theme-page">
      <section className="theme-panel container">
        <h1>{t('calendar.title')}</h1>
        {(events.data ?? []).map((event) => (
          <article key={event.id}>
            <h3>{event.title}</h3>
            <p>{formatRange(event.starts_at, event.ends_at)}</p>
            <p>{event.description}</p>
          </article>
        ))}
        {!events.data?.length ? <p>{t('calendar.empty')}</p> : null}
      </section>
    </div>
  )
}
