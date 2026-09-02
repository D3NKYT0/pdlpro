import type { InputHTMLAttributes, ReactNode } from 'react'
import './ui.css'

/** Checkbox nativo com aparência única de alternância e suporte a teclado. */
export function Toggle({ label, className = '', busy = false, disabled, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; busy?: boolean }) {
  return <label className={`ui-toggle ${className}`}>
    <input {...props} type="checkbox" disabled={disabled || busy} aria-busy={busy || undefined} />
    <span className="admin-toggle-control" aria-hidden="true"><i /></span><span>{label}</span>
  </label>
}
