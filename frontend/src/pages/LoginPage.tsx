import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
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
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>{challenge ? 'Verificação 2FA' : 'Entrar'}</h1>
        {challenge ? (
          <label className="field">
            Código do autenticador
            <input value={code} onChange={(e) => setCode(e.target.value)} required autoFocus inputMode="numeric" />
          </label>
        ) : (
          <>
            <label className="field">
              Usuário ou e-mail
              <input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} required />
            </label>
            <label className="field">
              Senha
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
          </>
        )}
        <button className="btn" type="submit">
          {challenge ? 'Confirmar' : 'Acessar'}
        </button>
        <p className="muted">
          Sem conta? <Link to="/register">Cadastre-se</Link>
          {' · '}
          <Link to="/forgot-password">Esqueci a senha</Link>
        </p>
      </form>
    </div>
  )
}
