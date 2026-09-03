import { useState, type ReactNode } from 'react'
import { themeAsset, themeImage } from '../../theme/assets'
import { useTheme } from '../../theme/ThemeProvider'

type AuthPanelProps = {
  title: string
  lead?: string
  children: ReactNode
  footer?: ReactNode
}

const defaultLead = '"Onde Lendas Nascem, Heróis Lutam e a Glória é Eterna."'

export function AuthPanel({ title, lead, children, footer }: AuthPanelProps) {
  const theme = useTheme()
  if (theme.presentation?.renderer === 'portal-v1') {
    const shell = theme.presentation.shells?.auth
    return (
      <section className="portal-auth-shell" data-theme-surface="auth">
        <div className="portal-auth-backdrop" aria-hidden="true" />
        <div className="portal-auth-frame">
          <div className="portal-auth-brand">
            <span>{shell?.kicker ?? 'ENTER THE REALM'}</span>
            <img src={themeAsset('images/logo-text.png')} alt={shell?.brand ?? theme.name} />
            <h1>{title}</h1>
            <p>{lead || defaultLead}</p>
          </div>
          <div className="auth-panel portal-auth-card">
            {children}
            {footer ? <div className="auth-extra">{footer}</div> : null}
          </div>
        </div>
      </section>
    )
  }
  return (
    <>
      <div className="video">
        <video autoPlay muted loop playsInline src={themeImage('video.mp4')} onError={(event) => event.currentTarget.remove()} />
      </div>
      <section className="h auth-hero">
        <div className="auth-split">
          <div className="auth-brand">
            <div className="h-logo">
              <img className="letters" src={themeImage('logo.png')} alt="PDL" />
              <img className="circle" src={themeImage('logo-circle.png')} alt="" />
            </div>
            <h1>{title}</h1>
            <p className="hero-description">{lead || defaultLead}</p>
          </div>
          <div className="auth-panel">
            {children}
            {footer ? <div className="auth-extra">{footer}</div> : null}
          </div>
        </div>
      </section>
    </>
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
