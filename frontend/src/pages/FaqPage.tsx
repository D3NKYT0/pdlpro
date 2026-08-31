import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../services/api'

export function FaqPage() {
  const faq = useQuery({ queryKey: ['faq'], queryFn: contentApi.faq })

  return (
    <section className="card">
      <h1>FAQ</h1>
      {(faq.data ?? []).map((item) => (
        <article key={item.id}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </article>
      ))}
      {!faq.data?.length && <p className="muted">Nenhuma pergunta publicada.</p>}
    </section>
  )
}
