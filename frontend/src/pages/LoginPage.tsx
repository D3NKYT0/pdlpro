import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import { isApiError, isTwoFactorChallenge } from '../services/api'

function safeNext(value: string | null) {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value
  return '/painel'
}

export function LoginPage() {
  const { login, verifyTwoFactor } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [challenge, setChallenge] = useState('')
  const [code, setCode] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      if (challenge) {
        await verifyTwoFactor(challenge, code)
        navigate(next)
        return
      }
      const result = await login(loginValue, password)
      if (isTwoFactorChallenge(result)) {
        setChallenge(result.challenge)
        toast.success('Informe o código do autenticador')
        return
      }
      navigate(next)
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no login')
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
          </>
        )}
        <div className="h-link">
          <button type="submit">{challenge ? 'Confirmar' : 'Entrar no Reino'}</button>
          <Link to="/register">Crie sua conta mestra</Link>
        </div>
      </form>
    </AuthPanel>
  )
}
