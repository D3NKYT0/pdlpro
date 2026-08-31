import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
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
    <AuthPanel
      title="Nova senha"
      lead="Defina uma nova senha para voltar ao reino."
      footer={
        <p>
          <Link to="/login">← Voltar para o login</Link>
        </p>
      }
    >
      <form onSubmit={onSubmit}>
        {!token ? <p className="auth-lead">Link inválido.</p> : null}
        <AuthField label="Nova senha">
          <AuthPassword value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <button className="theme-btn-gold" type="submit" disabled={!token}>
          Salvar
        </button>
      </form>
    </AuthPanel>
  )
}
