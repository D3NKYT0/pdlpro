import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi, isApiError } from '../services/api'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState(token ? 'Verificando…' : 'Link inválido.')

  useEffect(() => {
    if (!token) return
    authApi
      .verifyEmail(token)
      .then(() => setStatus('E-mail confirmado. Você já pode usar a conta.'))
      .catch((error) => setStatus(isApiError(error) ? error.message : 'Não foi possível confirmar o e-mail.'))
  }, [token])

  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Verificar e-mail</h1>
        <p>{status}</p>
        <p className="muted">
          <Link to="/login">Entrar</Link>
        </p>
      </section>
    </div>
  )
}
