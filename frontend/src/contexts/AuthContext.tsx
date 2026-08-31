import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type ApiUser } from '../services/api'

interface AuthContextValue {
  user: ApiUser | null
  loading: boolean
  login: (login: string, password: string) => Promise<void>
  register: (payload: { username: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (login, password) => setUser(await authApi.login(login, password)),
      register: async (payload) => setUser(await authApi.register(payload)),
      logout: async () => {
        await authApi.logout()
        setUser(null)
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
