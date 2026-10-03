import { Link, type LinkProps } from 'react-router-dom'
import { useResourceControls } from '../../contexts/ResourceControlsContext'

/** Mantém o resumo editorial visível quando abrir o detalhe está desativado. */
export function ResourceLink({ code, children, className, ...link }: LinkProps & { code: string }) {
  const enabled = useResourceControls()
  return enabled(code) ? <Link {...link} className={className}>{children}</Link> : <article className={className || 'public-row'}>{children}</article>
}
