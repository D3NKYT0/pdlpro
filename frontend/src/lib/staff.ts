/** A SPA usa capacidades da sessão; flags de entrada no Django não concedem ações. */
export type AccessUser = {
  capabilities?: string[]; is_staff?: boolean; is_superuser?: boolean;
  is_staff_member?: boolean; role?: string
}

export function hasCapability(user: AccessUser | null, capability: string) {
  return Boolean(user?.capabilities?.includes(capability))
}

export function canAccessStaff(user: AccessUser | null) {
  return Boolean(user?.capabilities?.length)
}

const routeCapabilities: Record<string, string> = {
  resources: 'resources.manage', roadmap: 'content.manage', supporters: 'programs.manage',
  commerce: 'commerce.manage', rewards: 'games.manage', items: 'items.view',
  server: 'settings.manage', 'coming-soon': 'settings.manage', accounts: 'accounts.view',
  moderation: 'moderation.manage', services: 'commerce.manage', coins: 'finance.manage',
  'charge-currencies': 'finance.manage', 'coin-packages': 'finance.manage', wallet: 'finance.manage',
  shop: 'commerce.manage', banners: 'content.manage', news: 'content.manage', calendar: 'content.manage',
  faq: 'content.manage', wiki: 'content.manage', downloads: 'content.manage',
  notifications: 'notifications.manage', games: 'games.manage', support: 'support.manage',
  audit: 'audit.view', metrics: 'metrics.view', financial: 'financial_reports.view',
}

/** Configuradores exigem manage; consultas exigem view. Rotas desconhecidas são negadas. */
export function canAccessAdminPath(user: AccessUser | null, pathname: string) {
  if (!canAccessStaff(user)) return false
  if (pathname === '/panel/admin' || pathname === '/panel/admin/') return true
  if (pathname.startsWith('/ext/')) return Boolean(user?.is_superuser)
  const parts = pathname.split('/').filter(Boolean)
  const section = parts[2]
  if (['secrets', 'integrations', 'themes'].includes(section)) return Boolean(user?.is_superuser)
  if (section === 'reports') {
    if (!parts[3]) return hasCapability(user, 'operational_reports.view') || hasCapability(user, 'financial_reports.view')
    return hasCapability(user, parts[3] === 'financial' ? 'financial_reports.view' : 'operational_reports.view')
  }
  return Boolean(routeCapabilities[section] && hasCapability(user, routeCapabilities[section]))
}
