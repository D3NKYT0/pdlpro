import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import i18n from '../i18n'
import {
  clearSessionMarkers,
  hasRememberedSession,
  markSessionExpired,
  rememberAuthenticatedSession,
  SESSION_EXPIRED_EVENT,
} from '../lib/sessionNotice'
import { authApi, isTwoFactorChallenge, restoreSession, refreshSession, type ApiUser, type TwoFactorChallenge } from '../services/api'

const REFRESH_EVERY_MS = 10 * 60 * 1000
const RETRY_EVERY_MS = 5000

interface AuthContextValue {
  user: ApiUser | null
  loading: boolean
  login: (login: string, password: string, hcaptchaToken?: string) => Promise<ApiUser | TwoFactorChallenge>
  verifyTwoFactor: (challenge: string, code: string) => Promise<void>
  register: (payload: { username: string; email: string; password: string; accept_terms: boolean; hcaptcha_token?: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef<ApiUser | null>(null)
  userRef.current = user

  const establishSession = (next: ApiUser) => {
    rememberAuthenticatedSession()
    setUser(next)
  }

  const expireSession = (source: 'live' | 'boot') => {
    const remembered = hasRememberedSession()
    const wasAuthenticated = userRef.current !== null
    if (!remembered && !wasAuthenticated) return

    markSessionExpired()
    userRef.current = null
    setUser(null)
    if (source === 'live') {
      toast.error(i18n.t('login.sessionExpired', { ns: 'auth' }))
    }
  }

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const scheduleRetry = () => {
      retryTimer = setTimeout(() => {
        void restoreSession(() => authApi.me()).then((result) => {
          if (cancelled) return
          if (result.user) {
            establishSession(result.user)
            return
          }
          if (result.retry) scheduleRetry()
          else expireSession('boot')
        })
      }, RETRY_EVERY_MS)
    }

    void restoreSession(() => authApi.me()).then((result) => {
      if (cancelled) return
      if (result.user) establishSession(result.user)
      else {
        setUser(null)
        if (!result.retry) expireSession('boot')
      }
      setLoading(false)
      if (result.retry) scheduleRetry()
    })

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  useEffect(() => {
    const onExpired = () => expireSession('live')
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  useEffect(() => {
    if (!user) return

    const keepAlive = async () => {
      const result = await refreshSession()
      if (result === 'expired') expireSession('live')
    }
    const intervalId = window.setInterval(() => {
      void keepAlive()
    }, REFRESH_EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void keepAlive()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (login, password, hcaptchaToken) => {
        const result = await authApi.login(login, password, hcaptchaToken)
        if (isTwoFactorChallenge(result)) return result
        establishSession(result)
        return result
      },
      verifyTwoFactor: async (challenge, code) => {
        establishSession(await authApi.verifyTwoFactor(challenge, code))
      },
      register: async (payload) => establishSession(await authApi.register(payload)),
      logout: async () => {
        await authApi.logout()
        clearSessionMarkers()
        setUser(null)
      },
      refreshUser: async () => {
        establishSession(await authApi.me())
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
