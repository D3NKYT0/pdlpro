const HAD_SESSION_KEY = 'pdl.hadSession'
const EXPIRED_KEY = 'pdl.sessionExpired'

/** Disparado pelo cliente HTTP quando o refresh JWT responde 401. */
export const SESSION_EXPIRED_EVENT = 'pdl-session-expired'

export function rememberAuthenticatedSession() {
  try {
    sessionStorage.setItem(HAD_SESSION_KEY, '1')
    sessionStorage.removeItem(EXPIRED_KEY)
  } catch {
    /* storage indisponível (modo privado restrito) */
  }
}

export function clearSessionMarkers() {
  try {
    sessionStorage.removeItem(HAD_SESSION_KEY)
    sessionStorage.removeItem(EXPIRED_KEY)
  } catch {
    /* ignore */
  }
}

export function hasRememberedSession(): boolean {
  try {
    return sessionStorage.getItem(HAD_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/** Marca aviso de expiração para a tela de login. Retorna se havia sessão lembrada. */
export function markSessionExpired(): boolean {
  try {
    const remembered = sessionStorage.getItem(HAD_SESSION_KEY) === '1'
    sessionStorage.removeItem(HAD_SESSION_KEY)
    if (remembered) sessionStorage.setItem(EXPIRED_KEY, '1')
    return remembered
  } catch {
    return false
  }
}

/** Consome o aviso uma vez (lead/toast na tela de login). */
export function consumeSessionExpiredNotice(): boolean {
  try {
    if (sessionStorage.getItem(EXPIRED_KEY) !== '1') return false
    sessionStorage.removeItem(EXPIRED_KEY)
    return true
  } catch {
    return false
  }
}

export function announceSessionExpired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}
