import { apiErrorMessage } from '../lib/errors'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'

export function CompleteAccountPage() {
  const { t } = useTranslation('auth')
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
      <AuthPanel title={t('complete.titleLoading')} lead={t('common.loadingSession')}>
        <p className="muted">{t('common.waitMoment')}</p>
      </AuthPanel>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.has_usable_password !== false) {
    return <Navigate to="/panel" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmPassword) {
      toast.error(t('complete.passwordMismatch'))
      return
    }
    setBusy(true)
    try {
      await authApi.completeCredentials({ username, password, accept_terms: acceptTerms })
      await refreshUser()
      toast.success(t('complete.success'))
      navigate('/panel', { replace: true })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('complete.error')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthPanel
      title={t('complete.title')}
      lead={t('complete.lead')}
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthField label={t('common.username')}>
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
        <AuthField label={t('common.password')}>
          <AuthPassword value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <AuthField label={t('common.confirmPassword')}>
          <AuthPassword value={confirmPassword} onChange={setConfirmPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <label className="auth-check">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            required
          />
          {t('common.acceptTermsPrefix')} <Link to="/terms">{t('common.terms')}</Link> {t('common.acceptTermsAnd')} <Link to="/privacy">{t('common.privacy')}</Link>
        </label>
        <div className="h-link">
          <button type="submit" disabled={busy || !acceptTerms}>
            {busy ? t('complete.submitting') : t('complete.submit')}
          </button>
        </div>
      </form>
      <p className="auth-security-note">
        <i className="fa-solid fa-shield-halved" /> {t('complete.securityNote')}
      </p>
    </AuthPanel>
  )
}
