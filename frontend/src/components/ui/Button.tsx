import type { ComponentPropsWithRef, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import './ui.css'

export interface ButtonAppearance {
  /** ghost é o nome legado da variante secondary, com textura azul. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export interface ButtonProps extends ComponentPropsWithRef<'button'>, ButtonAppearance {
  busy?: boolean
  busyLabel?: ReactNode
}

/** Classes únicas para ações e links, preservando as texturas do tema do painel. */
function buttonClasses({ variant = 'primary', size = 'md' }: ButtonAppearance, className = '') {
  const secondary = variant === 'secondary' || variant === 'ghost'
  return ['btn', 'ui-button', secondary ? 'ghost' : '', `ui-button--${secondary ? 'secondary' : variant}`, size === 'md' ? '' : `ui-button--${size}`, className].filter(Boolean).join(' ')
}

/** Ação padrão do painel. O tipo padrão é button; use type="submit" para salvar.
 * busy bloqueia interação e anuncia o envio. O hook de ação também deve impedir repetição.
 */
export function Button({ variant, size, busy = false, busyLabel = 'Aguarde…', disabled, className, children, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} data-theme-part="button" className={buttonClasses({ variant, size }, className)} disabled={disabled || busy} aria-busy={busy || undefined}>
    {busy ? <><LoaderCircle className="ui-button-spinner" aria-hidden="true" /><span className="ui-button-busy-label">{busyLabel}</span></> : children}
  </button>
}

/** Ação compacta com nome acessível obrigatório; ícone não substitui a descrição. */
export function IconButton({ label, className = '', ...props }: Omit<ButtonProps, 'aria-label'> & { label: string }) {
  return <Button {...props} aria-label={props.busy ? `${label}: ${typeof props.busyLabel === 'string' ? props.busyLabel : 'Aguarde…'}` : label} title={props.title ?? label} className={`ui-button--icon ${className}`} />
}

/** Navegação interna com a mesma aparência. Mantém semântica de link e Ctrl+clique.
 * Não oferece busy/disabled: para executar operações, use Button.
 */
export function ButtonLink({ variant, size, className, ...props }: ComponentPropsWithRef<typeof Link> & ButtonAppearance) {
  return <Link {...props} data-theme-part="button" className={buttonClasses({ variant, size }, className)} />
}
