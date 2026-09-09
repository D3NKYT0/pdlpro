import { isApiError } from '../services/api'

/** Expõe mensagens públicas da API; falhas técnicas recebem o fallback da ação. */
export function apiErrorMessage(error: unknown, fallback: string) {
  return isApiError(error) ? error.message : fallback
}
