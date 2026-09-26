import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { apiErrorMessage } from '../lib/errors'
import { lineageApi, type ApiAccessibleAccount } from '../services/api'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'pdl_active_account'

export interface ActiveAccountContextValue {
  activeLogin: string | null
  activeAccount: ApiAccessibleAccount | null
  accounts: ApiAccessibleAccount[]
  isLoading: boolean
  setActiveAccount: (login: string) => Promise<void>
  refreshAccounts: () => Promise<void>
}

const ActiveAccountContext = createContext<ActiveAccountContextValue | null>(null)

export function ActiveAccountProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('panel')
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeLogin, setActiveLoginState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const accountsQuery = useQuery({
    queryKey: ['lineage-accounts'],
    queryFn: lineageApi.accounts,
    enabled: Boolean(user),
  })

  const accounts = useMemo(() => accountsQuery.data?.accounts ?? [], [accountsQuery.data?.accounts])

  useEffect(() => {
    if (!accounts.length) {
      if (activeLogin !== null) {
        setActiveLoginState(null)
      }
      return
    }

    const exists = accounts.some((acc) => acc.login.toLowerCase() === activeLogin?.toLowerCase())
    if (!exists) {
      const stored = localStorage.getItem(STORAGE_KEY)
      const storedMatch = accounts.find((acc) => acc.login.toLowerCase() === stored?.toLowerCase())
      if (storedMatch) {
        setActiveLoginState(storedMatch.login)
      } else {
        const primary = accounts.find((acc) => acc.is_primary) ?? accounts[0]
        if (primary) {
          setActiveLoginState(primary.login)
          try {
            localStorage.setItem(STORAGE_KEY, primary.login)
          } catch {
            // ignore localStorage error
          }
        }
      }
    }
  }, [accounts, activeLogin])

  const activeAccount = useMemo(
    () => accounts.find((acc) => acc.login.toLowerCase() === activeLogin?.toLowerCase()) ?? null,
    [accounts, activeLogin]
  )

  async function setActiveAccount(login: string) {
    setActiveLoginState(login)
    try {
      localStorage.setItem(STORAGE_KEY, login)
    } catch {
      // ignore
    }

    try {
      await lineageApi.setActiveAccount(login)
      toast.success(t('activeAccount.switchSuccess', { login, defaultValue: `Conta ativa alterada para ${login}` }))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('activeAccount.switchError', { defaultValue: 'Não foi possível alterar a conta ativa no servidor' })))
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['characters'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      ])
    }
  }

  async function refreshAccounts() {
    await accountsQuery.refetch()
  }

  const value = useMemo<ActiveAccountContextValue>(
    () => ({
      activeLogin,
      activeAccount,
      accounts,
      isLoading: accountsQuery.isLoading,
      setActiveAccount,
      refreshAccounts,
    }),
    [activeLogin, activeAccount, accounts, accountsQuery.isLoading]
  )

  return <ActiveAccountContext.Provider value={value}>{children}</ActiveAccountContext.Provider>
}

const defaultActiveAccountContext: ActiveAccountContextValue = {
  activeLogin: null,
  activeAccount: null,
  accounts: [],
  isLoading: false,
  setActiveAccount: async () => {},
  refreshAccounts: async () => {},
}

export function useActiveAccount(): ActiveAccountContextValue {
  const context = useContext(ActiveAccountContext)
  return context ?? defaultActiveAccountContext
}
