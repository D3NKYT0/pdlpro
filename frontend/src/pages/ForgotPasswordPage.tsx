import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel } from '../components/auth/AuthPanel'
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
    <AuthPanel
      title="Esqueceu sua senha?"
      lead="Digite seu e-mail abaixo e enviaremos instruções para redefinir sua senha."
      footer={
        <p>
          <Link to="/login">← Voltar para o login</Link>
        </p>
      }
    >
      <form onSubmit={onSubmit}>
        <AuthField label="Seu e-mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="seunome@email.com" />
        </AuthField>
        <button className="theme-btn-gold" type="submit">
          Enviar instruções
        </button>
      </form>
    </AuthPanel>
  )
}
