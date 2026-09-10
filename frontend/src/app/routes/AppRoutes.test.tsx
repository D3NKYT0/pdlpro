// @vitest-environment jsdom
/** A árvore real de rotas deve abrir cada módulo mesmo com a API ainda pendente. */
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CookieConsentProvider } from '../../contexts/CookieConsentContext'
import { AppRoutes } from './AppRoutes'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user', username: 'Tester', display_name: 'Tester', email: 'tester@test.dev', is_staff: true, is_email_verified: true }, loading: false, logout: vi.fn(), refreshUser: vi.fn() }) }))
vi.mock('../../services/infra/http', async original => ({ ...await original<object>(), request: vi.fn(() => new Promise(() => {})) }))
let client: QueryClient
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['resources'], [])
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function mountRoutes() {
  return render(
    <QueryClientProvider client={client}>
      <CookieConsentProvider>
        <AppRoutes />
      </CookieConsentProvider>
    </QueryClientProvider>,
  )
}
const pages = [
  ['/home', 'Inicie sua Jornada em Lineage Agora!'],
  ['/forgot-password', 'Esqueceu sua senha?'],
  ['/reset-password', 'Nova senha'],
  ['/verify-email', 'Verificar e-mail'],
  ['/roadmap', 'Roadmap do servidor'],
  ['/rankings', 'Os mais fortes do reino'],
  ['/info', 'Conheça o reino'],
  ['/news', 'Notícias'],
  ['/news/update', 'Notícia'],
  ['/wiki', 'Wiki'],
  ['/wiki/guide', 'Wiki'],
  ['/calendar', 'Calendário'],
  ['/faq', 'Perguntas Frequentes'],
  ['/downloads', 'Downloads'],
  ['/terms', 'Documento'],
  ['/privacy', 'Documento'],
  ['/agreement', 'Documento'],
  ['/cookies', 'Documento'],
  ['/lgpd', 'Documento'],
  ['/legal/history', 'Histórico de versões'],
  ['/panel', 'Olá, Tester'],
  ['/panel/profile', 'Tester'],
  ['/panel/security', 'Conta e segurança'],
  ['/panel/accounts', 'Conta Lineage'],
  ['/panel/accounts/hero/7', 'Personagem'],
  ['/panel/wallet', 'Banco PDL'],
  ['/panel/wallet/game', 'Carteira ↔ jogo'],
  ['/panel/wallet/orders', 'Pedidos'],
  ['/panel/wallet/statement', 'Extrato'],
  ['/panel/inventory', 'Inventário'],
  ['/panel/games', 'Jogos e recompensas'],
  ['/panel/progress', 'Seu progresso'],
  ['/panel/notifications', 'Avisos'],
  ['/panel/support', 'Como podemos ajudar?'],
  ['/panel/help', 'Ajuda'],
  ['/panel/shop', 'Loja do servidor'],
  ['/panel/marketplace', 'Marketplace'],
  ['/panel/auctions', 'Leilões'],
  ['/panel/supporters', 'Programa de apoiadores'],
  ['/panel/rewards', 'Jornada e recompensas'],
  ['/panel/admin', 'Central de configurações'],
  ['/panel/admin/resources', 'Controle de recursos'],
  ['/panel/admin/roadmap', 'Gerenciar roadmap'],
  ['/panel/admin/supporters', 'Apoiadores e comissões'],
  ['/panel/admin/commerce', 'Pacotes e cupons'],
  ['/panel/admin/rewards', 'Oficina de recompensas'],
  ['/panel/admin/reports', 'Relatórios'],
  ['/panel/admin/reports/financial/balances', 'Financeiro'],
  ['/panel/admin/items', 'Observar itens'],
  ['/panel/admin/items/customs', 'Itens customizados'],
  ['/panel/admin/server', 'Painel e servidor'],
  ['/panel/admin/accounts', 'Contas Lineage'],
  ['/panel/admin/services', 'Serviços'],
  ['/panel/admin/coins', 'Moedas'],
  ['/panel/admin/wallet', 'Configuração da carteira'],
  ['/panel/admin/shop', 'Loja'],
  ['/panel/admin/news', 'Notícias'],
  ['/panel/admin/games', 'Módulos de jogos'],
  ['/panel/admin/support', 'Fila de chamados'],
  ['/panel/admin/themes', 'Temas do PDL'],
]

it('leva /login autenticado para a landing', () => {
  window.history.replaceState({}, '', '/login')
  mountRoutes()
  expect(window.location.pathname).toBe('/home')
  expect(screen.getByRole('heading', { level: 1, name: 'Inicie sua Jornada em Lineage Agora!' })).toBeTruthy()
})

it('leva /register autenticado para o gerenciador de sessões', () => {
  window.history.replaceState({}, '', '/register')
  mountRoutes()
  expect(window.location.pathname).toBe('/panel/security')
  expect(screen.getByRole('heading', { level: 1, name: 'Conta e segurança' })).toBeTruthy()
})

it.each(pages)('abre %s com API pendente', (path, heading) => {
  window.history.replaceState({}, '', path)
  mountRoutes()
  expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy()
  expect(window.location.pathname).toBe(path)
})
