import { apiErrorMessage } from '../lib/errors'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthPanel } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import type { OAuthProvider } from '../lib/oauth'
import { authApi, isTwoFactorChallenge } from '../services/api'

export function OAuthCallbackPage() {
  const { t } = useTranslation('auth')
  const { provider } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code') || ''
    const state = params.get('state') || ''
    if ((provider !== 'google' && provider !== 'discord') || !code || !state) {
      toast.error(t('oauth.invalidResponse'))
      navigate('/login', { replace: true })
      return
    }

    void authApi.completeOAuth(provider as OAuthProvider, code, state).then(async (result) => {
      if ('linked' in result && result.linked) {
        toast.success(t('oauth.linkedSuccess'))
        navigate('/panel/security', { replace: true })
        return
      }
      if (isTwoFactorChallenge(result)) {
        navigate('/login', { replace: true, state: { oauthChallenge: result.challenge } })
        return
      }
      await refreshUser()
      toast.success(t('oauth.loginSuccess', { provider: provider === 'google' ? t('common.google') : t('common.discord') }))
      navigate(
        'has_usable_password' in result && result.has_usable_password === false
          ? '/complete-account'
          : '/panel',
        { replace: true },
      )
    }).catch((error) => {
      toast.error(apiErrorMessage(error, t('oauth.error')))
      navigate('/login', { replace: true })
    })
  }, [navigate, params, provider, refreshUser, t])

  return (
    <AuthPanel title={t('oauth.title')} lead={t('oauth.lead')}>
      <div className="auth-oauth-loading">
        <span className="spinner" /> {t('oauth.authenticating')}
      </div>
    </AuthPanel>
  )
}
