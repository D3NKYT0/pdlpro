import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

const SLUGS: Record<string, string> = {
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/agreement': 'agreement',
}

const LEGAL_NAV = [
  { to: '/agreement', label: 'Acordo' },
  { to: '/terms', label: 'Termos' },
  { to: '/privacy', label: 'Privacidade' },
]

export function LegalPage() {
  const { pathname } = useLocation()
  const slug = SLUGS[pathname] ?? 'terms'
  const doc = useQuery({ queryKey: ['legal', slug], queryFn: () => contentApi.legalDocument(slug) })

  return (
    <div className="public-page">
      <PublicHero kicker="Legal" title={doc.data?.title ?? 'Documento'} />
      <nav className="public-nav container" aria-label="Documentos legais">
        {LEGAL_NAV.map((item) => (
          <Link key={item.to} to={item.to} className={pathname === item.to ? 'is-active' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="container">
        {doc.isLoading ? (
          <PublicEmpty>Carregando o documento...</PublicEmpty>
        ) : doc.data ? (
          <article className="public-prose">
            {doc.data.version ? <span className="public-kicker">Versão {doc.data.version}</span> : null}
            <div className="public-body">{doc.data.body}</div>
          </article>
        ) : (
          <PublicEmpty>Este documento não está disponível no momento.</PublicEmpty>
        )}
      </div>
    </div>
  )
}
