import { Crown, Handshake, Heart, LifeBuoy, Megaphone, PencilLine, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const icons = { player: UserRound, supporter: Heart, promoter: Megaphone, partner: Handshake, support: LifeBuoy, moderator: ShieldCheck, editor: PencilLine, staff: Users, admin: Crown }

/** Identifica um papel por texto, ícone e cor sem atribuir significado de autorização à cor. */
export function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation('panel')
  const Icon = icons[role as keyof typeof icons] ?? UserRound
  return <span className="access-role-badge" data-theme-part="role-badge" data-role={role}>
    <Icon size={14} aria-hidden="true" />{t(`profile.roles.${role}`)}
  </span>
}
