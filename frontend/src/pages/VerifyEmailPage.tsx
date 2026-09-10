import { apiErrorMessage } from '../lib/errors'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthPanel } from '../components/auth/AuthPanel'
import { authApi } from '../services/api'

export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    authApi
      .verifyEmail(token)
      .then(() => setStatus(t('verify.success')))
      .catch((error) => setStatus(apiErrorMessage(error, t('verify.error'))))
  }, [token, t])

  const lead = status ?? (token ? t('verify.verifying') : t('common.invalidLink'))

  return (
    <AuthPanel
      title={t('verify.title')}
      lead={lead}
    >
      <div className="h-link">
        <Link to="/login">{t('common.enterRealm')}</Link>
        <Link to="/">{t('common.backHome')}</Link>
      </div>
    </AuthPanel>
  )
}
