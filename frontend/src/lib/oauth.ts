import { apiErrorMessage } from './errors'
import { authApi } from '../services/api'
import i18n from '../i18n'
import toast from 'react-hot-toast'

export type OAuthProvider = 'google' | 'discord'

export async function beginOAuth(provider: OAuthProvider, mode: 'login' | 'link') {
  try {
    const result = await authApi.beginOAuth(provider, mode)
    window.location.assign(result.authorization_url)
  } catch (error) {
    toast.error(apiErrorMessage(error, i18n.t('oauthStartError', { ns: 'common' })))
  }
}
