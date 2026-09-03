import type { ComponentPropsWithRef, ReactNode } from 'react'
import './ui.css'

export interface FieldProps extends ComponentPropsWithRef<'label'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
}

/** Mantém o controle nativo dentro do label, compartilhando espaçamento e foco.
 * Para dicas/erros, passe IDs nos conteúdos e aria-describedby no controle.
 */
export function Field({ label, hint, error, className = '', children, ...props }: FieldProps) {
  return <label {...props} data-theme-part="field" className={`field ui-field ${className}`.trim()}>
    {label}{children}
    {hint && <small className="muted">{hint}</small>}
    {error && <small className="ui-field-error" role="alert">{error}</small>}
  </label>
}
