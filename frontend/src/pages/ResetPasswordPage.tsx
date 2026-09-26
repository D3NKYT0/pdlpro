import { apiErrorMessage } from '../lib/errors'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel, AuthPassword } from '../components/auth/AuthPanel'
import { authApi } from '../services/api'

export function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmPassword) {
      toast.error(t('reset.passwordMismatch'))
      return
    }
    setBusy(true)
    try {
      await authApi.confirmPasswordReset(token, password)
      toast.success(t('reset.success'))
      navigate('/login')
    } catch (error) {
      toast.error(apiErrorMessage(error, t('reset.error')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthPanel
      title={t('reset.title')}
      lead={t('reset.lead')}
    >
      <form className="auth-form" onSubmit={onSubmit}>
        {!token ? <p className="auth-lead">{t('common.invalidLink')}</p> : null}
        <AuthField label={t('reset.passwordLabel')}>
          <AuthPassword value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <AuthField label={t('reset.confirmPasswordLabel')}>
          <AuthPassword value={confirmPassword} onChange={setConfirmPassword} required minLength={8} autoComplete="new-password" />
        </AuthField>
        <div className="h-link">
          <button type="submit" disabled={!token || busy}>
            {busy ? t('reset.submitting') : t('reset.submit')}
          </button>
          <Link to="/login">{t('common.enterRealm')}</Link>
        </div>
      </form>
    </AuthPanel>
  )
}
