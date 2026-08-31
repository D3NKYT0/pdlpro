import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { contentApi } from '../services/api'

const SLUGS: Record<string, string> = {
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/agreement': 'agreement',
}

export function LegalPage() {
  const { pathname } = useLocation()
  const slug = SLUGS[pathname] ?? 'terms'
  const doc = useQuery({ queryKey: ['legal', slug], queryFn: () => contentApi.legalDocument(slug) })

  return (
    <section className="card hero">
      <h1>{doc.data?.title ?? 'Documento'}</h1>
      <p className="muted">Versão {doc.data?.version}</p>
      <p>{doc.data?.body}</p>
    </section>
  )
}
