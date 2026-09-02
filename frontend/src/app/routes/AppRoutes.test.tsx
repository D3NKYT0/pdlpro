// @vitest-environment jsdom
/** A árvore real de rotas deve abrir cada módulo mesmo com a API ainda pendente. */
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user', username: 'Tester', display_name: 'Tester', email: 'tester@test.dev', is_staff: true, is_email_verified: true }, loading: false, logout: vi.fn(), refreshUser: vi.fn() }) }))
vi.mock('../../services/infra/http', async original => ({ ...await original<object>(), request: vi.fn(() => new Promise(() => {})) }))
let client: QueryClient
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['resources'], [])
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const pages = [
  ['/login', 'Entre no Reino'],
  ['/register', 'Crie sua conta mestre'],
  ['/forgot-password', 'Esqueceu sua senha?'],
  ['/reset-password', 'Nova senha'],
  ['/verify-email', 'Verificar e-mail'],
  ['/roadmap', 'Roadmap do servidor'],
  ['/rankings', 'Os mais fortes do reino'],
  ['/informacoes', 'Conheça o reino'],
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
  ['/painel', 'Olá, Tester'],
  ['/painel/profile', 'Tester'],
  ['/painel/security', 'Conta e segurança'],
  ['/painel/accounts', 'Conta Lineage'],
  ['/painel/accounts/hero/7', 'Personagem'],
  ['/painel/wallet', 'Banco PDL'],
  ['/painel/wallet/jogo', 'Carteira ↔ jogo'],
  ['/painel/inventory', 'Inventário'],
  ['/painel/games', 'Jogos e recompensas'],
  ['/painel/progress', 'Seu progresso'],
  ['/painel/notifications', 'Avisos'],
  ['/painel/support', 'Como podemos ajudar?'],
  ['/painel/shop', 'Loja do servidor'],
  ['/painel/marketplace', 'Marketplace'],
  ['/painel/auctions', 'Leilões'],
  ['/painel/apoiadores', 'Programa de apoiadores'],
  ['/painel/recompensas', 'Jornada e recompensas'],
  ['/painel/admin', 'Central de configurações'],
  ['/painel/admin/recursos', 'Controle de recursos'],
  ['/painel/admin/roadmap', 'Gerenciar roadmap'],
  ['/painel/admin/apoiadores', 'Apoiadores e comissões'],
  ['/painel/admin/comercio', 'Pacotes e cupons'],
  ['/painel/admin/recompensas', 'Oficina de recompensas'],
  ['/painel/admin/financeiro', 'Relatórios financeiros'],
  ['/painel/admin/itens', 'Observar itens'],
  ['/painel/admin/itens/customs', 'Itens customizados'],
  ['/painel/admin/servidor', 'Painel e servidor'],
  ['/painel/admin/contas', 'Contas Lineage'],
  ['/painel/admin/servicos', 'Serviços'],
  ['/painel/admin/moedas', 'Moedas'],
  ['/painel/admin/loja', 'Loja'],
  ['/painel/admin/noticias', 'Notícias'],
  ['/painel/admin/jogos', 'Módulos de jogos'],
  ['/painel/admin/atendimento', 'Fila de chamados'],
  ['/painel/admin/temas', 'Temas do PDL'],
]

it.each(pages)('abre %s com API pendente', (path, heading) => {
  window.history.replaceState({}, '', path)
  render(<QueryClientProvider client={client}><AppRoutes /></QueryClientProvider>)
  expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy()
  expect(window.location.pathname).toBe(path)
})
