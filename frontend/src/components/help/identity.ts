import type { ApiUser } from '../../services/types'
import { canAccessStaff } from '../../lib/staff'
import { isSafePreferredName } from './moderation'

export type HelpRole = 'player' | 'staff' | 'superadmin'

export interface HelpIdentity {
  suggestedName?: string
  role: HelpRole
  roleLabel: string
}

/** Traduz a sessão confiável do painel para a apresentação do assistente. */
export function helpIdentity(user: ApiUser | null): HelpIdentity {
  const candidate = (user?.display_name || user?.username || '').trim().split(/\s+/)[0]
  const suggestedName = candidate && isSafePreferredName(candidate) ? candidate : undefined
  if (user?.is_superuser) return { suggestedName, role: 'superadmin', roleLabel: 'superadministrador' }
  if (canAccessStaff(user)) return { suggestedName, role: 'staff', roleLabel: 'equipe' }
  return { suggestedName, role: 'player', roleLabel: 'jogador' }
}
