import { authApi, isApiError } from '../services/api'
import toast from 'react-hot-toast'

export type OAuthProvider = 'google' | 'discord'

export async function beginOAuth(provider: OAuthProvider, mode: 'login' | 'link') {
  try {
    const result = await authApi.beginOAuth(provider, mode)
    window.location.assign(result.authorization_url)
  } catch (error) {
    toast.error(isApiError(error) ? error.message : 'Não foi possível iniciar a conexão.')
  }
}
