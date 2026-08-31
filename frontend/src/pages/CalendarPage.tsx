import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../services/api'

export function CalendarPage() {
  const events = useQuery({ queryKey: ['calendar'], queryFn: contentApi.calendar })

  return (
    <div className="theme-page">
      <section className="theme-panel container">
        <h1>Calendário</h1>
        {(events.data ?? []).map((event) => (
          <article key={event.id}>
            <h3>{event.title}</h3>
            <p>
              {new Date(event.starts_at).toLocaleString()} — {new Date(event.ends_at).toLocaleString()}
            </p>
            <p>{event.description}</p>
          </article>
        ))}
        {!events.data?.length ? <p>Nenhum evento publicado.</p> : null}
      </section>
    </div>
  )
}
