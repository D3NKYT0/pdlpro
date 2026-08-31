import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import { isApiError } from '../services/api'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await register({ username, email, password, accept_terms: acceptTerms })
      toast.success('Conta criada. Confirme o e-mail enviado.')
      navigate('/painel')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no cadastro')
    }
  }

  return (
    <AuthPanel
      title="Crie sua conta mestre"
      lead="Preencha os campos abaixo para se juntar à aventura."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthField label="Usuário">
          <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={16} autoComplete="username" />
        </AuthField>
        <AuthField label="E-mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </AuthField>
        <AuthField label="Senha">
          <AuthPassword value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <label className="auth-check">
          <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} required />
          Eu concordo com os <Link to="/terms">termos</Link> e a <Link to="/privacy">privacidade</Link>
        </label>
        <div className="h-link">
          <button type="submit">Crie sua conta mestra</button>
          <Link to="/login">Entrar no Reino</Link>
        </div>
      </form>
    </AuthPanel>
  )
}
