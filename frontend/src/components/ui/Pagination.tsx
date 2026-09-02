import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from './Button'

/** Paginação controlada. O chamador mantém filtros e busca os dados da página. */
export function Pagination({ page, pages, onChange, busy = false, className = '' }: { page: number; pages: number; onChange: (page: number) => void; busy?: boolean; className?: string }) {
  return <nav className={`ui-pagination ${className}`} aria-label="Paginação">
    <span>Página <strong>{page}</strong> de {pages}</span>
    <Button disabled={busy || page <= 1} onClick={() => onChange(page - 1)}><ArrowLeft size={15} aria-hidden="true" /> Anterior</Button>
    <Button disabled={busy || page >= pages} onClick={() => onChange(page + 1)}>Próxima <ArrowRight size={15} aria-hidden="true" /></Button>
  </nav>
}
