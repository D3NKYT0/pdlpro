import { useQuery } from '@tanstack/react-query'
import {
  CircleUserRound,
  Gamepad2,
  Package,
  ShoppingBag,
  SlidersHorizontal,
  UserRoundCog,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useActiveAccount } from '../../contexts/ActiveAccountContext'
import { canAccessStaff } from '../../lib/staff'
import { authApi, gamesApi, lineageApi, programsApi, serverApi, walletApi } from '../../services/api'

const shortcuts: Array<{ to: string; key: string; icon: LucideIcon; resource?: string }> = [
  { to: '/panel/profile', key: 'profile', icon: CircleUserRound, resource: 'profile' },
  { to: '/panel/accounts', key: 'accounts', icon: UserRoundCog, resource: 'accounts' },
  { to: '/panel/inventory', key: 'inventory', icon: Package, resource: 'inventory' },
  { to: '/panel/wallet', key: 'wallet', icon: WalletCards, resource: 'wallet' },
  { to: '/panel/shop', key: 'shop', icon: ShoppingBag, resource: 'shop' },
  { to: '/panel/games', key: 'games', icon: Gamepad2, resource: 'games' },
]

/** Agrega o que o índice do painel precisa mostrar sem espalhar queries na página. */
export function usePanelDashboard() {
  const { user } = useAuth()
  const { activeLogin } = useActiveAccount()
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const resourceEnabled = (code?: string) =>
    !code || !resources.data?.some((row) => row.code === code && !row.enabled)

  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const progressEnabled = Boolean(user) && resourceEnabled('progress')
  const progress = useQuery({
    queryKey: ['progress'],
    queryFn: authApi.progress,
    enabled: progressEnabled,
  })
  const walletEnabled = resourceEnabled('wallet')
  const wallet = useQuery({
    queryKey: ['wallet'],
    queryFn: walletApi.me,
    enabled: walletEnabled,
  })
  const accountsEnabled = resourceEnabled('accounts')
  const accounts = useQuery({
    queryKey: ['lineage-accounts'],
    queryFn: lineageApi.accounts,
    enabled: accountsEnabled,
  })
  const selectedLogin =
    activeLogin ?? accounts.data?.accounts.find((row) => row.is_primary)?.login ?? accounts.data?.accounts[0]?.login
  const characters = useQuery({
    queryKey: ['characters', selectedLogin],
    queryFn: () => lineageApi.characters(selectedLogin),
    enabled: accountsEnabled && Boolean(selectedLogin),
  })
  const gamesEnabled = resourceEnabled('games')
  const bag = useQuery({
    queryKey: ['bag'],
    queryFn: gamesApi.bag,
    enabled: gamesEnabled,
  })

  const baseShortcuts = shortcuts.filter((item) => resourceEnabled(item.resource))
  const dashboardShortcuts = canAccessStaff(user)
    ? [...baseShortcuts, { to: '/panel/admin', key: 'admin', icon: SlidersHorizontal }]
    : baseShortcuts

  const roster = [...(characters.data ?? [])].sort((left, right) => {
    if (left.online !== right.online) return Number(right.online) - Number(left.online)
    return right.level - left.level
  })

  return {
    user,
    resourceEnabled,
    status: status.data,
    progress: progress.data,
    progressEnabled,
    wallet: wallet.data,
    walletEnabled,
    accountsCount: accounts.data?.accounts.length ?? 0,
    accountsEnabled,
    accountsPending: accounts.isPending || characters.isPending,
    selectedLogin,
    roster: roster.slice(0, 4),
    rosterTotal: roster.length,
    bagCount: bag.data?.length ?? 0,
    gamesEnabled,
    dashboardShortcuts,
  }
}
