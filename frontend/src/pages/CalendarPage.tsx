import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../services/api'

export function CalendarPage() {
  const events = useQuery({ queryKey: ['calendar'], queryFn: contentApi.calendar })

  return (
    <section className="card">
      <h1>Calendário</h1>
      {(events.data ?? []).map((event) => (
        <article className="card" key={event.id}>
          <h3>{event.title}</h3>
          <p className="muted">
            {new Date(event.starts_at).toLocaleString()} — {new Date(event.ends_at).toLocaleString()}
          </p>
          <p>{event.description}</p>
        </article>
      ))}
      {!events.data?.length && <p className="muted">Nenhum evento publicado.</p>}
    </section>
  )
}
