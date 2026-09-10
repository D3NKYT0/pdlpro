import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { themeAsset } from '../../theme/assets'
import { useTheme } from '../../theme/ThemeProvider'
import { PdlHeroEmblem } from '../PdlSymbol'
import { ThemeHeroVideo } from '../ThemeHeroVideo'

type AuthPanelProps = {
  title: string
  lead?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthPanel({ title, lead, children, footer }: AuthPanelProps) {
  const { t } = useTranslation('auth')
  const theme = useTheme()
  const resolvedLead = lead || t('panel.defaultLead')
  if (theme.presentation?.renderer === 'portal-v1') {
    const shell = theme.presentation.shells?.auth
    return (
      <section className="portal-auth-shell" data-theme-surface="auth">
        <div className="portal-auth-backdrop" aria-hidden="true" />
        <div className="portal-auth-frame">
          <div className="portal-auth-brand">
            <span>{shell?.kicker ?? t('panel.kickerFallback')}</span>
            <img src={themeAsset('images/logo-text.png')} alt={shell?.brand ?? theme.name} />
            <h1>{title}</h1>
            <p>{resolvedLead}</p>
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
    <div data-theme-surface="auth">
      <section className="h auth-hero">
        <ThemeHeroVideo />
        <div className="auth-split">
          <div className="auth-brand">
            <div className="h-logo">
              <PdlHeroEmblem />
            </div>
            <h1>{title}</h1>
            <p className="hero-description">{resolvedLead}</p>
          </div>
          <div className="auth-panel">
            {children}
            {footer ? <div className="auth-extra">{footer}</div> : null}
          </div>
        </div>
      </section>
    </div>
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
  const { t } = useTranslation('auth')
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
      <button className="auth-password-toggle" type="button" onClick={() => setVisible((current) => !current)} aria-label={t('panel.showPassword')}>
        <i className={visible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
      </button>
    </div>
  )
}
