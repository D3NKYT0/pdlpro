import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, isTwoFactorChallenge, type ApiUser, type TwoFactorChallenge } from '../services/api'
import { refreshSession } from '../services/infra/http'
import { restoreSession } from '../services/infra/session'

const REFRESH_EVERY_MS = 10 * 60 * 1000
const RETRY_EVERY_MS = 5000

interface AuthContextValue {
  user: ApiUser | null
  loading: boolean
  login: (login: string, password: string) => Promise<ApiUser | TwoFactorChallenge>
  verifyTwoFactor: (challenge: string, code: string) => Promise<void>
  register: (payload: { username: string; email: string; password: string; accept_terms: boolean }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const scheduleRetry = () => {
      retryTimer = setTimeout(() => {
        void restoreSession(() => authApi.me()).then((result) => {
          if (cancelled) return
          if (result.user) {
            setUser(result.user)
            return
          }
          if (result.retry) scheduleRetry()
        })
      }, RETRY_EVERY_MS)
    }

    void restoreSession(() => authApi.me()).then((result) => {
      if (cancelled) return
      setUser(result.user)
      setLoading(false)
      if (result.retry) scheduleRetry()
    })

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const keepAlive = () => {
      void refreshSession()
    }
    const intervalId = window.setInterval(keepAlive, REFRESH_EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') keepAlive()
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
      login: async (login, password) => {
        const result = await authApi.login(login, password)
        if (isTwoFactorChallenge(result)) return result
        setUser(result)
        return result
      },
      verifyTwoFactor: async (challenge, code) => {
        setUser(await authApi.verifyTwoFactor(challenge, code))
      },
      register: async (payload) => setUser(await authApi.register(payload)),
      logout: async () => {
        await authApi.logout()
        setUser(null)
      },
      refreshUser: async () => {
        setUser(await authApi.me())
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
