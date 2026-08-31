import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthPanel } from '../components/auth/AuthPanel'
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
    <AuthPanel
      title="Verificar e-mail"
      lead={status}
    >
      <div className="h-link">
        <Link to="/login">Entrar no Reino</Link>
        <Link to="/">Voltar ao início</Link>
      </div>
    </AuthPanel>
  )
}
