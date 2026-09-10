import { apiErrorMessage } from '../lib/errors'
import { useState, type FormEvent } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DiscordIcon, GoogleIcon } from '../components/BrandIcons'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import { beginOAuth } from '../lib/oauth'
import { authApi } from '../services/api'
import { hcaptchaLanguage } from '../i18n/locale'

const SESSION_MANAGER_PATH = '/panel/security'

export function RegisterPage() {
  const { t, i18n } = useTranslation('auth')
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const capabilities = useQuery({ queryKey: ['auth-capabilities'], queryFn: authApi.capabilities })
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')

  if (loading) {
    return (
      <AuthPanel title={t('register.title')} lead={t('common.loadingSession')}>
        <p className="muted">{t('common.waitMoment')}</p>
      </AuthPanel>
    )
  }

  if (user) {
    if (user.has_usable_password === false) {
      return <Navigate to="/complete-account" replace />
    }
    return <Navigate to={SESSION_MANAGER_PATH} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await register({ username, email, password, accept_terms: acceptTerms, hcaptcha_token: captchaToken })
      toast.success(t('register.success'))
      navigate('/panel')
    } catch (error) {
      toast.error(apiErrorMessage(error, t('register.error')))
    }
  }

  return (
    <AuthPanel
      title={t('register.title')}
      lead={t('register.lead')}
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthField label={t('common.username')}>
          <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={16} autoComplete="username" />
        </AuthField>
        <AuthField label={t('common.email')}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </AuthField>
        <AuthField label={t('common.password')}>
          <AuthPassword value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <label className="auth-check">
          <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} required />
          {t('common.acceptTermsPrefix')} <Link to="/terms">{t('common.terms')}</Link> {t('common.acceptTermsAnd')} <Link to="/privacy">{t('common.privacy')}</Link> {t('common.acceptTermsAlso')} <Link to="/agreement">{t('common.agreement')}</Link>
        </label>
        {capabilities.data?.captcha && capabilities.data.hcaptcha_site_key ? (
          <div className="auth-captcha">
            <HCaptcha sitekey={capabilities.data.hcaptcha_site_key} theme="dark" languageOverride={hcaptchaLanguage(i18n.language)} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
          </div>
        ) : null}
        <div className="h-link">
          <button type="submit" disabled={Boolean(capabilities.data?.captcha && !captchaToken)}>{t('register.submit')}</button>
          <Link to="/login">{t('common.enterRealm')}</Link>
        </div>
      </form>
      <div className="auth-divider"><span>{t('common.orContinueWith')}</span></div>
      <div className="auth-methods">
        <button
          type="button"
          className="auth-method"
          disabled={!capabilities.data?.google}
          onClick={() => void beginOAuth('google', 'login')}
          title={!capabilities.data?.google ? t('common.googleNotConfigured') : undefined}
        >
          <GoogleIcon /> {t('common.google')}
        </button>
        <button
          type="button"
          className="auth-method"
          disabled={!capabilities.data?.discord}
          onClick={() => void beginOAuth('discord', 'login')}
          title={!capabilities.data?.discord ? t('common.discordNotConfigured') : undefined}
        >
          <DiscordIcon /> {t('common.discord')}
        </button>
      </div>
      <p className="auth-security-note">
        <i className="fa-solid fa-shield-halved" /> {t('register.securityNote')}
      </p>
    </AuthPanel>
  )
}
