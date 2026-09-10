import { apiErrorMessage } from '../lib/errors'
import { consumeSessionExpiredNotice } from '../lib/sessionNotice'
import { useState, type FormEvent } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useQuery } from '@tanstack/react-query'
import { Fingerprint } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DiscordIcon, GoogleIcon } from '../components/BrandIcons'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import { authApi, isApiError, isTwoFactorChallenge } from '../services/api'
import { credentialJSON, requestOptions } from '../lib/webauthn'
import { beginOAuth } from '../lib/oauth'
import { hcaptchaLanguage } from '../i18n/locale'

const LANDING_PATH = '/home'

function safeNext(value: string | null) {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value
  return '/panel'
}

function alreadyLoggedInDestination(nextParam: string | null) {
  if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) return nextParam
  return LANDING_PATH
}

export function LoginPage() {
  const { t, i18n } = useTranslation('auth')
  const { user, loading, login, verifyTwoFactor, refreshUser } = useAuth()
  const capabilities = useQuery({ queryKey: ['auth-capabilities'], queryFn: authApi.capabilities })
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [challenge, setChallenge] = useState(() => (location.state as { oauthChallenge?: string } | null)?.oauthChallenge || '')
  const [code, setCode] = useState('')
  const [captchaRequired, setCaptchaRequired] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [sessionExpired] = useState(() => consumeSessionExpiredNotice())

  if (loading) {
    return (
      <AuthPanel title={t('login.title')} lead={t('common.loadingSession')}>
        <p className="muted">{t('common.waitMoment')}</p>
      </AuthPanel>
    )
  }

  if (user) {
    if (user.has_usable_password === false) {
      return <Navigate to="/complete-account" replace />
    }
    return <Navigate to={alreadyLoggedInDestination(params.get('next'))} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      if (challenge) {
        await verifyTwoFactor(challenge, code)
        navigate(next)
        return
      }
      const result = await login(loginValue, password, captchaToken)
      if (isTwoFactorChallenge(result)) {
        setChallenge(result.challenge)
        toast.success(t('login.toast2fa'))
        return
      }
      navigate(next)
    } catch (error) {
      if (isApiError(error) && error.details.captcha_required === true) {
        setCaptchaRequired(true)
        setCaptchaToken('')
      }
      toast.error(apiErrorMessage(error, t('login.error')))
    }
  }

  async function loginWithPasskey() {
    if (!window.PublicKeyCredential) {
      toast.error(t('login.passkeyUnsupported'))
      return
    }
    setPasskeyLoading(true)
    try {
      const begin = await authApi.beginPasskeyLogin(loginValue)
      const credential = await navigator.credentials.get({ publicKey: requestOptions(begin.options) }) as PublicKeyCredential | null
      if (!credential) throw new Error(t('login.passkeyCancelled'))
      const result = await authApi.completePasskeyLogin(begin.state, credentialJSON(credential))
      if (isTwoFactorChallenge(result)) {
        setChallenge(result.challenge)
        toast.success(t('login.toast2fa'))
        return
      }
      await refreshUser()
      navigate(next)
    } catch (error) {
      toast.error(apiErrorMessage(error, t('login.passkeyError')))
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <AuthPanel
      title={challenge ? t('login.title2fa') : t('login.title')}
      lead={challenge ? t('login.lead2fa') : sessionExpired ? t('login.sessionExpired') : undefined}
      footer={
        <p>
          <Link to="/forgot-password">{t('login.forgotLink')}</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        {challenge ? (
          <AuthField label={t('login.codeLabel')}>
            <input value={code} onChange={(event) => setCode(event.target.value)} required autoFocus inputMode="numeric" />
          </AuthField>
        ) : (
          <>
            <AuthField label={t('common.username')}>
              <input type="text" value={loginValue} onChange={(event) => setLoginValue(event.target.value)} required autoComplete="username" />
            </AuthField>
            <AuthField label={t('common.password')}>
              <AuthPassword value={password} onChange={setPassword} required autoComplete="current-password" />
            </AuthField>
            {captchaRequired && capabilities.data?.hcaptcha_site_key ? (
              <div className="auth-captcha">
                <HCaptcha
                  sitekey={capabilities.data.hcaptcha_site_key}
                  theme="dark"
                  languageOverride={hcaptchaLanguage(i18n.language)}
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken('')}
                />
              </div>
            ) : null}
          </>
        )}
        <div className="h-link">
          <button type="submit">{challenge ? t('login.confirm') : t('login.submit')}</button>
          <Link to="/register">{t('login.createAccount')}</Link>
        </div>
      </form>
      {!challenge ? (
        <>
          <div className="auth-divider"><span>{t('common.orContinueWith')}</span></div>
          <div className="auth-methods">
            <button type="button" className="auth-method auth-method-passkey" disabled={passkeyLoading} onClick={() => void loginWithPasskey()}>
              <Fingerprint aria-hidden="true" /> {passkeyLoading ? t('login.passkeyWaiting') : t('login.passkey')}
            </button>
            <button type="button" className="auth-method" disabled={!capabilities.data?.google} onClick={() => void beginOAuth('google', 'login')} title={!capabilities.data?.google ? t('common.googleNotConfigured') : undefined}>
              <GoogleIcon /> {t('common.google')}
            </button>
            <button type="button" className="auth-method" disabled={!capabilities.data?.discord} onClick={() => void beginOAuth('discord', 'login')} title={!capabilities.data?.discord ? t('common.discordNotConfigured') : undefined}>
              <DiscordIcon /> {t('common.discord')}
            </button>
          </div>
          <p className="auth-security-note"><i className="fa-solid fa-shield-halved" /> {t('login.securityNote')}</p>
        </>
      ) : null}
    </AuthPanel>
  )
}
