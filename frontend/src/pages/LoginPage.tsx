import { useState, type FormEvent } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useQuery } from '@tanstack/react-query'
import { Fingerprint } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import { authApi, isApiError, isTwoFactorChallenge } from '../services/api'
import { credentialJSON, requestOptions } from '../lib/webauthn'
import { beginOAuth } from '../lib/oauth'

function safeNext(value: string | null) {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value
  return '/painel'
}

export function LoginPage() {
  const { login, verifyTwoFactor, refreshUser } = useAuth()
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
        toast.success('Informe o código do autenticador')
        return
      }
      navigate(next)
    } catch (error) {
      if (isApiError(error) && error.details.captcha_required === true) {
        setCaptchaRequired(true)
        setCaptchaToken('')
      }
      toast.error(isApiError(error) ? error.message : 'Falha no login')
    }
  }

  async function loginWithPasskey() {
    if (!window.PublicKeyCredential) {
      toast.error('Este navegador não oferece suporte a chaves de acesso.')
      return
    }
    setPasskeyLoading(true)
    try {
      const begin = await authApi.beginPasskeyLogin(loginValue)
      const credential = await navigator.credentials.get({ publicKey: requestOptions(begin.options) }) as PublicKeyCredential | null
      if (!credential) throw new Error('Operação cancelada')
      const result = await authApi.completePasskeyLogin(begin.state, credentialJSON(credential))
      if (isTwoFactorChallenge(result)) {
        setChallenge(result.challenge)
        toast.success('Informe o código do autenticador')
        return
      }
      await refreshUser()
      navigate(next)
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível entrar com a chave de acesso.')
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <AuthPanel
      title={challenge ? 'Verificação 2FA' : 'Entre no Reino'}
      lead={challenge ? 'Informe o código do autenticador para continuar.' : undefined}
      footer={
        <p>
          <Link to="/forgot-password">Esqueceu a senha?</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        {challenge ? (
          <AuthField label="Código do autenticador">
            <input value={code} onChange={(event) => setCode(event.target.value)} required autoFocus inputMode="numeric" />
          </AuthField>
        ) : (
          <>
            <AuthField label="Usuário">
              <input type="text" value={loginValue} onChange={(event) => setLoginValue(event.target.value)} required autoComplete="username" />
            </AuthField>
            <AuthField label="Senha">
              <AuthPassword value={password} onChange={setPassword} required autoComplete="current-password" />
            </AuthField>
            {captchaRequired && capabilities.data?.hcaptcha_site_key ? (
              <div className="auth-captcha">
                <HCaptcha
                  sitekey={capabilities.data.hcaptcha_site_key}
                  theme="dark"
                  languageOverride="pt-BR"
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken('')}
                />
              </div>
            ) : null}
          </>
        )}
        <div className="h-link">
          <button type="submit">{challenge ? 'Confirmar' : 'Entrar no Reino'}</button>
          <Link to="/register">Crie sua conta mestra</Link>
        </div>
      </form>
      {!challenge ? (
        <>
          <div className="auth-divider"><span>ou continue com</span></div>
          <div className="auth-methods">
            <button type="button" className="auth-method auth-method-passkey" disabled={passkeyLoading} onClick={() => void loginWithPasskey()}>
              <Fingerprint aria-hidden="true" /> {passkeyLoading ? 'Aguardando...' : 'Chave de acesso'}
            </button>
            <button type="button" className="auth-method" disabled={!capabilities.data?.google} onClick={() => void beginOAuth('google', 'login')} title={!capabilities.data?.google ? 'Configure as credenciais Google no ambiente' : undefined}>
              <b className="auth-provider-google">G</b> Google
            </button>
            <button type="button" className="auth-method" disabled={!capabilities.data?.discord} onClick={() => void beginOAuth('discord', 'login')} title={!capabilities.data?.discord ? 'Configure as credenciais Discord no ambiente' : undefined}>
              <i className="fa-brands fa-discord" aria-hidden="true" /> Discord
            </button>
          </div>
          <p className="auth-security-note"><i className="fa-solid fa-shield-halved" /> Protegido por CAPTCHA adaptativo, verificação de e-mail e 2FA.</p>
        </>
      ) : null}
    </AuthPanel>
  )
}
