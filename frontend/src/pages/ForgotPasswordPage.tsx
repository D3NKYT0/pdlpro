import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi, isApiError } from '../services/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await authApi.requestPasswordReset(email)
      toast.success('Se o e-mail existir, enviamos o link de redefinição.')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível enviar')
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Recuperar senha</h1>
        <label className="field">
          E-mail
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <button className="btn" type="submit">
          Enviar link
        </button>
        <p className="muted">
          <Link to="/login">Voltar ao login</Link>
        </p>
      </form>
    </div>
  )
}
