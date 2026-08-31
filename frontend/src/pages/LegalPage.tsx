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
    <div className="container terms-page" style={{ padding: '40px 16px 80px' }}>
      <div className="bg-dark">
        <h1>🛡️ {doc.data?.title ?? 'Documento'}</h1>
        <p className="text-sm">Versão {doc.data?.version}</p>
        <p>{doc.data?.body}</p>
      </div>
    </div>
  )
}
