import { isApiError } from '../services/infra/http'

/** Expõe mensagens públicas da API; falhas técnicas recebem o fallback da ação. */
export function apiErrorMessage(error: unknown, fallback: string) {
  return isApiError(error) ? error.message : fallback
}
