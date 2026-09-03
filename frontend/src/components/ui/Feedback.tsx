import type { ReactNode } from 'react'
import { AlertCircle, CircleDashed, Clock3 } from 'lucide-react'
import { Button } from './Button'
import './ui.css'

/** Estados de consulta compartilhados; vazio não é erro e retry é sempre explícito. */
export function EmptyState({ children, icon = <CircleDashed size={28} aria-hidden="true" />, className = '' }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return <div className={`ui-empty ${className}`.trim()} data-theme-part="empty-state">{icon}<p>{children}</p></div>
}
export function LoadingState({ children = 'Carregando informações…', className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`ui-empty ${className}`.trim()} data-theme-part="loading-state" role="status" aria-live="polite"><Clock3 size={24} aria-hidden="true" /><p>{children}</p></div>
}
export function ErrorNotice({ error, fallback = 'Não foi possível concluir. Tente novamente.', onRetry, className = '' }: { error: unknown; fallback?: string; onRetry?: () => void; className?: string }) {
  if (!error) return null
  return <div className={`ui-error ${className}`.trim()} data-theme-part="error-notice" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{error instanceof Error ? error.message : fallback}</span>{onRetry && <Button variant="ghost" onClick={onRetry}>Tentar novamente</Button>}</div>
}
