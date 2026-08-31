import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { isApiError } from '../services/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await login(loginValue, password)
      navigate('/')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha no login')
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Entrar</h1>
        <label className="field">
          Usuário ou e-mail
          <input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} required />
        </label>
        <label className="field">
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn" type="submit">
          Acessar
        </button>
        <p className="muted">
          Sem conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </form>
    </div>
  )
}
