import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
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
      navigate('/')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no cadastro')
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Criar conta</h1>
        <label className="field">
          Usuário
          <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={16} />
        </label>
        <label className="field">
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        <label className="field">
          <span>
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required /> Aceito os{' '}
            <Link to="/terms">termos</Link> e a <Link to="/privacy">privacidade</Link>
          </span>
        </label>
        <button className="btn" type="submit">
          Registrar
        </button>
        <p className="muted">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
