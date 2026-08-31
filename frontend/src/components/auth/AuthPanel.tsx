import { useState, type ReactNode } from 'react'

type AuthPanelProps = {
  title: string
  lead?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthPanel({ title, lead, children, footer }: AuthPanelProps) {
  return (
    <section className="auth-panel">
      <h1>{title}</h1>
      {lead ? <p className="auth-lead">{lead}</p> : null}
      {children}
      {footer ? <div className="auth-links">{footer}</div> : null}
    </section>
  )
}

type AuthFieldProps = {
  label: string
  children: ReactNode
}

export function AuthField({ label, children }: AuthFieldProps) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

type AuthPasswordProps = {
  value: string
  onChange: (value: string) => void
  required?: boolean
  minLength?: number
  autoComplete?: string
}

export function AuthPassword({ value, onChange, required, minLength, autoComplete }: AuthPasswordProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="auth-password">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
      <button className="auth-password-toggle" type="button" onClick={() => setVisible((current) => !current)} aria-label="Mostrar senha">
        <i className={visible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
      </button>
    </div>
  )
}
