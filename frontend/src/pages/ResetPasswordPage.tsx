import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi, isApiError } from '../services/api'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await authApi.confirmPasswordReset(token, password)
      toast.success('Senha redefinida')
      navigate('/login')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível redefinir')
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Nova senha</h1>
        {!token ? <p className="muted">Link inválido.</p> : null}
        <label className="field">
          Nova senha
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
        </label>
        <button className="btn" type="submit" disabled={!token}>
          Salvar
        </button>
        <p className="muted">
          <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
