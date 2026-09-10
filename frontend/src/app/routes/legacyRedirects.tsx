import { Navigate, useParams } from 'react-router-dom'

/** Map Portuguese/legacy panel path prefixes to English destinations. */
export const LEGACY_EXACT_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/inicio', to: '/home' },
  { from: '/informacoes', to: '/info' },

  { from: '/wallet', to: '/panel/wallet' },
  { from: '/accounts', to: '/panel/accounts' },
  { from: '/inventory', to: '/panel/inventory' },
  { from: '/games', to: '/panel/games' },
  { from: '/progress', to: '/panel/progress' },
  { from: '/notifications', to: '/panel/notifications' },
  { from: '/shop', to: '/panel/shop' },
  { from: '/marketplace', to: '/panel/marketplace' },
  { from: '/auctions', to: '/panel/auctions' },

  { from: '/painel', to: '/panel' },
  { from: '/painel/profile', to: '/panel/profile' },
  { from: '/painel/security', to: '/panel/security' },
  { from: '/painel/accounts', to: '/panel/accounts' },
  { from: '/painel/inventory', to: '/panel/inventory' },
  { from: '/painel/wallet', to: '/panel/wallet' },
  { from: '/painel/wallet/jogo', to: '/panel/wallet/game' },
  { from: '/painel/wallet/pedidos', to: '/panel/wallet/orders' },
  { from: '/painel/wallet/extrato', to: '/panel/wallet/statement' },
  { from: '/painel/shop', to: '/panel/shop' },
  { from: '/painel/marketplace', to: '/panel/marketplace' },
  { from: '/painel/auctions', to: '/panel/auctions' },
  { from: '/painel/games', to: '/panel/games' },
  { from: '/painel/recompensas', to: '/panel/rewards' },
  { from: '/painel/apoiadores', to: '/panel/supporters' },
  { from: '/painel/progress', to: '/panel/progress' },
  { from: '/painel/notifications', to: '/panel/notifications' },
  { from: '/painel/support', to: '/panel/support' },
  { from: '/painel/ajuda', to: '/panel/help' },

  { from: '/painel/admin', to: '/panel/admin' },
  { from: '/painel/admin/recursos', to: '/panel/admin/resources' },
  { from: '/painel/admin/roadmap', to: '/panel/admin/roadmap' },
  { from: '/painel/admin/apoiadores', to: '/panel/admin/supporters' },
  { from: '/painel/admin/comercio', to: '/panel/admin/commerce' },
  { from: '/painel/admin/recompensas', to: '/panel/admin/rewards' },
  { from: '/painel/admin/relatorios', to: '/panel/admin/reports' },
  { from: '/painel/admin/itens', to: '/panel/admin/items' },
  { from: '/painel/admin/itens/customs', to: '/panel/admin/items/customs' },
  { from: '/painel/admin/servidor', to: '/panel/admin/server' },
  { from: '/painel/admin/contas', to: '/panel/admin/accounts' },
  { from: '/painel/admin/servicos', to: '/panel/admin/services' },
  { from: '/painel/admin/moedas', to: '/panel/admin/coins' },
  { from: '/painel/admin/carteira', to: '/panel/admin/wallet' },
  { from: '/painel/admin/loja', to: '/panel/admin/shop' },
  { from: '/painel/admin/noticias', to: '/panel/admin/news' },
  { from: '/painel/admin/jogos', to: '/panel/admin/games' },
  { from: '/painel/admin/atendimento', to: '/panel/admin/support' },
  { from: '/painel/admin/temas', to: '/panel/admin/themes' },
]

const REPORT_CATEGORY_MAP: Record<string, string> = {
  financeiro: 'financial',
  inventario: 'inventory',
  leiloes: 'auctions',
  compras: 'purchases',
  marketplace: 'marketplace',
  financial: 'financial',
  inventory: 'inventory',
  auctions: 'auctions',
  purchases: 'purchases',
}

const FINANCE_REPORT_MAP: Record<string, string> = {
  saldos: 'balances',
  'fluxo-caixa': 'cash-flow',
  pagamentos: 'payments',
  reconciliacao: 'reconciliation',
  balances: 'balances',
  'cash-flow': 'cash-flow',
  payments: 'payments',
  reconciliation: 'reconciliation',
}

/** Redirect `/painel/accounts/:login/:charId` → `/panel/accounts/...`. */
export function LegacyAccountDetailRedirect() {
  const { login, charId } = useParams()
  return <Navigate to={`/panel/accounts/${login}/${charId}`} replace />
}

/** Redirect Portuguese report category/report URLs to English slugs. */
export function LegacyReportsRedirect() {
  const { category, report } = useParams()
  const mappedCategory = category ? REPORT_CATEGORY_MAP[category] ?? category : undefined
  if (!mappedCategory) return <Navigate to="/panel/admin/reports" replace />
  if (mappedCategory === 'financial') {
    const mappedReport = report ? FINANCE_REPORT_MAP[report] ?? 'balances' : 'balances'
    return <Navigate to={`/panel/admin/reports/financial/${mappedReport}`} replace />
  }
  if (report) {
    return <Navigate to={`/panel/admin/reports/${mappedCategory}`} replace />
  }
  return <Navigate to={`/panel/admin/reports/${mappedCategory}`} replace />
}

/** Redirect `/painel/admin/financeiro/:report?` → English financial reports. */
export function LegacyFinancialRedirect() {
  const { report } = useParams()
  const mappedReport = report ? FINANCE_REPORT_MAP[report] ?? 'balances' : 'balances'
  return <Navigate to={`/panel/admin/reports/financial/${mappedReport}`} replace />
}

/** @deprecated Prefer LEGACY_EXACT_REDIRECTS */
export const LEGACY_PANEL_REDIRECTS = LEGACY_EXACT_REDIRECTS
