import { apiErrorMessage } from '../lib/errors'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthField, AuthPanel } from '../components/auth/AuthPanel'
import { authApi } from '../services/api'

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await authApi.requestPasswordReset(email)
      toast.success(t('forgot.success'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('forgot.error')))
    }
  }

  return (
    <AuthPanel
      title={t('forgot.title')}
      lead={t('forgot.lead')}
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthField label={t('forgot.emailLabel')}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder={t('forgot.emailPlaceholder')} />
        </AuthField>
        <div className="h-link">
          <button type="submit">{t('forgot.submit')}</button>
          <Link to="/login">{t('common.enterRealm')}</Link>
        </div>
      </form>
    </AuthPanel>
  )
}
