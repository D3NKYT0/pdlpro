import { apiErrorMessage } from '../lib/errors'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'

export function CompleteAccountPage() {
  const { user, loading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user?.username) setUsername(user.username)
  }, [user?.username])

  if (loading) {
    return (
      <AuthPanel title="Finalizando cadastro" lead="Carregando sua sessão...">
        <p className="muted">Aguarde um momento.</p>
      </AuthPanel>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.has_usable_password !== false) {
    return <Navigate to="/painel" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmPassword) {
      toast.error('As senhas não conferem.')
      return
    }
    setBusy(true)
    try {
      await authApi.completeCredentials({ username, password, accept_terms: acceptTerms })
      await refreshUser()
      toast.success('Login e senha definidos. Bem-vindo ao reino.')
      navigate('/painel', { replace: true })
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível concluir o cadastro.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthPanel
      title="Defina seu login e senha"
      lead="Contas via Google ou Discord precisam de usuário e senha próprios para segurança e acesso ao reino."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthField label="Usuário">
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            minLength={3}
            maxLength={16}
            autoComplete="username"
          />
        </AuthField>
        <AuthField label="Senha">
          <AuthPassword value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <AuthField label="Confirmar senha">
          <AuthPassword value={confirmPassword} onChange={setConfirmPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <label className="auth-check">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            required
          />
          Eu concordo com os <Link to="/terms">termos</Link> e a <Link to="/privacy">privacidade</Link>
        </label>
        <div className="h-link">
          <button type="submit" disabled={busy || !acceptTerms}>
            {busy ? 'Salvando...' : 'Concluir cadastro'}
          </button>
        </div>
      </form>
      <p className="auth-security-note">
        <i className="fa-solid fa-shield-halved" /> O e-mail verificado do provedor já está vinculado; este passo cria suas credenciais locais.
      </p>
    </AuthPanel>
  )
}
