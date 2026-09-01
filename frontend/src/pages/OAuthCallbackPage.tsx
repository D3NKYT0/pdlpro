import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthPanel } from '../components/auth/AuthPanel'
import { useAuth } from '../contexts/AuthContext'
import type { OAuthProvider } from '../lib/oauth'
import { authApi, isApiError, isTwoFactorChallenge } from '../services/api'

export function OAuthCallbackPage() {
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
      toast.error('Resposta de autenticação inválida.')
      navigate('/login', { replace: true })
      return
    }

    void authApi.completeOAuth(provider as OAuthProvider, code, state).then(async (result) => {
      if ('linked' in result && result.linked) {
        toast.success('Conta conectada com sucesso.')
        navigate('/painel/security', { replace: true })
        return
      }
      if (isTwoFactorChallenge(result)) {
        navigate('/login', { replace: true, state: { oauthChallenge: result.challenge } })
        return
      }
      await refreshUser()
      toast.success(`Entrada com ${provider === 'google' ? 'Google' : 'Discord'} concluída.`)
      navigate('/painel', { replace: true })
    }).catch((error) => {
      toast.error(isApiError(error) ? error.message : 'Não foi possível concluir a autenticação.')
      navigate('/login', { replace: true })
    })
  }, [navigate, params, provider, refreshUser])

  return <AuthPanel title="Validando sua conta" lead="Aguarde enquanto concluímos a conexão segura."><div className="auth-oauth-loading"><span className="spinner" /> Autenticando...</div></AuthPanel>
}
