// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HelpPage } from './HelpPage'
import { resetHttpClient } from '../services/infra/http'
import { loadHelpPreferences } from '../components/help/preferences'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'experience-user', username: 'Daniel', role: 'player' } }) }))
const article = { id: '1', question: 'Como recuperar a senha?', short_answer: 'Abra a recuperação.', answer: 'Na tela de login, abra a recuperação.', category: 'account_security', category_label: 'Segurança', keywords: ['senha'] }
const pet = { level: 1, experience: 0, experience_next: 100, attributes: { satiety: 75, energy: 75, happiness: 75, hygiene: 75 } }
const reply = { language: 'pt', kind: 'knowledge', mode: 'generative', engine: 'remote', context: 'signed-context', answer: { text: 'Abra a recuperação de senha na página de login.', pose: '04-dica' } }
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
let client: QueryClient
let fetcher: ReturnType<typeof vi.fn>
let resolveReply: (value: Response) => void
beforeEach(() => {
  localStorage.clear()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/assistant/reply/')) return new Promise<Response>(resolve => { resolveReply = resolve })
    return Promise.resolve(response(url.includes('/auth/csrf/') ? { csrfToken: 'test' } : url.includes('/assistant/pet/') ? pet : url.includes('/resources/') ? [] : [article]))
  })
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('Image', class { onload: null | (() => void) = null; set src(_: string) { this.onload?.() } })
})
afterEach(() => { cleanup(); client.clear(); resetHttpClient(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
function mount(path = '/painel/ajuda') { render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><HelpPage /></MemoryRouter></QueryClientProvider>); return userEvent.setup() }
async function start() {
  const user = mount()
  await screen.findByRole('button', { name: article.question })
  const input = screen.getByRole('textbox', { name: 'Sua mensagem' })
  await user.type(input, 'Preciso recuperar minha senha')
  await user.dblClick(screen.getByRole('button', { name: 'Enviar mensagem' }))
  return { user, input }
}
it('mostra a mensagem imediatamente e permite preparar o próximo rascunho durante consulta e fala', async () => {
  const { user, input } = await start()
  expect(within(screen.getByRole('log')).getByText('Preciso recuperar minha senha')).toBeVisible()
  expect(input).toBeEnabled()
  expect(input).toHaveValue('')
  await user.type(input, 'E depois?{Enter}')
  expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/assistant/reply/'))).toHaveLength(1)
  resolveReply(response(reply))
  await screen.findByRole('button', { name: 'Mostrar resposta completa' })
  expect(input).toHaveValue('E depois?')
  expect(input).toBeEnabled()
  await user.type(input, ' Posso tentar agora?')
  await user.click(screen.getByRole('button', { name: 'Mostrar resposta completa' }))
  expect(input).toHaveValue('E depois? Posso tentar agora?')
  expect(within(screen.getByRole('log')).getAllByText('Preciso recuperar minha senha')).toHaveLength(1)
}, 15000)
it('marca falha na mensagem e repete a mesma pergunta sem apagar o rascunho seguinte', async () => {
  const { user, input } = await start()
  await user.type(input, 'Outra dúvida')
  resolveReply(response({ message: 'Serviço indisponível' }, 400))
  await screen.findByRole('alert')
  expect(input).toHaveValue('Outra dúvida')
  await user.click(screen.getByRole('button', { name: 'Reenviar mensagem' }))
  await waitFor(() => expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/assistant/reply/'))).toHaveLength(2))
  resolveReply(response(reply))
  await screen.findByRole('button', { name: 'Mostrar resposta completa' })
  expect(input).toHaveValue('Outra dúvida')
  expect(within(screen.getByRole('log')).getAllByText('Preciso recuperar minha senha')).toHaveLength(1)
}, 15000)
it('envia preferências explícitas, restaura somente a conta atual e não sobrescreve o contexto seguinte', async () => {
  const user = mount()
  await screen.findByRole('button', { name: article.question })
  await user.click(screen.getByRole('button', { name: 'Denkynho: ações e dicas' }))
  await user.type(screen.getByRole('textbox', { name: 'Como devo chamar você?' }), 'Dani')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Tamanho das respostas' }), 'detailed')
  await user.click(screen.getByRole('checkbox', { name: 'Lembrar minhas preferências' }))
  await user.click(screen.getByRole('button', { name: 'Aplicar preferências' }))
  await waitFor(() => expect(fetcher.mock.calls.some(([url, init]) => String(url).includes('/assistant/pet/') && (init as RequestInit)?.method === 'PATCH')).toBe(true))
  const patch = fetcher.mock.calls.find(([url, init]) => String(url).includes('/assistant/pet/') && (init as RequestInit)?.method === 'PATCH')!
  expect(JSON.parse((patch[1] as RequestInit).body as string)).toEqual({ preferred_name: 'Dani', detail: 'detailed' })
  await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  await user.click(screen.getByRole('button', { name: 'Fechar' }))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Como recupero senha?{Enter}')
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => String(url).includes('/assistant/reply/'))).toBe(true))
  const calls = () => fetcher.mock.calls.filter(([url]) => String(url).includes('/assistant/reply/'))
  expect(JSON.parse((calls()[0][1] as RequestInit).body as string).preferences).toEqual({ preferred_name: 'Dani', detail: 'detailed' })
  resolveReply(response(reply))
  await screen.findByText(reply.answer.text)
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'E depois?{Enter}')
  await waitFor(() => expect(calls()).toHaveLength(2))
  expect(JSON.parse((calls()[1][1] as RequestInit).body as string)).toMatchObject({ context: 'signed-context' })
  expect(JSON.parse((calls()[1][1] as RequestInit).body as string)).not.toHaveProperty('preferences')
  resolveReply(response(reply))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Nova conversa' })).toBeEnabled())
  expect(loadHelpPreferences('experience-user')?.preferred_name).toBe('Dani')
  cleanup(); client.clear()
  mount()
  expect(await screen.findByText(/Olá, Dani!/)).toBeVisible()
  expect(screen.queryByText(reply.answer.text)).not.toBeInTheDocument()
}, 15000)
it('mostra a espera viva, a pose de pensar e envia a tela conhecida', async () => {
  await start()
  expect(screen.getAllByText('Estou pensando…').length).toBeGreaterThan(0)
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '03-pensando')
  const payload = JSON.parse((fetcher.mock.calls.find(([url]) => String(url).includes('/assistant/reply/'))![1] as RequestInit).body as string)
  expect(payload.screen).toBe('/painel/ajuda')
  resolveReply(response(reply))
  await screen.findByRole('button', { name: 'Mostrar resposta completa' })
}, 15000)
it('oferece a pergunta da tela sem enviar automaticamente e ignora contexto externo', async () => {
  const user = mount('/painel/ajuda?from=%2Fpainel%2Faccounts')
  const suggestion = await screen.findByRole('button', { name: 'Como encontro minhas contas L2 e meus personagens?' })
  await user.click(suggestion)
  expect(screen.getByRole('textbox', { name: 'Sua mensagem' })).toHaveValue('Como encontro minhas contas L2 e meus personagens?')
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('/assistant/reply/'))).toBe(false)
  cleanup(); client.clear()
  mount('/painel/ajuda?from=https://evil.test/painel/accounts')
  await screen.findByRole('button', { name: article.question })
  expect(screen.queryByRole('button', { name: 'Como encontro minhas contas L2 e meus personagens?' })).not.toBeInTheDocument()
})
it('repete a chave de cuidado após perda de rede e mostra XP confirmado fora do menu', async () => {
  const user = mount()
  await screen.findByRole('button', { name: article.question })
  await user.click(screen.getByRole('button', { name: 'Denkynho: ações e dicas' }))
  let careCalls = 0
  fetcher.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('/assistant/pet/') && init?.method === 'POST') {
      careCalls++
      return careCalls === 1 ? Promise.reject(new Error('network')) : Promise.resolve(response({ ...pet, experience: 12, action: 'feed', xp_gained: 12, replayed: false }))
    }
    return Promise.resolve(response(String(input).includes('/csrf/') ? { csrfToken: 'test' } : pet))
  })
  await user.click(screen.getByRole('button', { name: 'Alimentar' }))
  await screen.findByRole('alert')
  await user.click(screen.getByRole('button', { name: 'Alimentar' }))
  await screen.findByText(/\+12 XP/)
  const calls = fetcher.mock.calls.filter(([url, init]) => String(url).includes('/assistant/pet/') && (init as RequestInit)?.method === 'POST')
  expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual(JSON.parse((calls[1][1] as RequestInit).body as string))
  await user.click(screen.getByRole('button', { name: 'Fechar' }))
  expect(screen.getByText(/\+12 XP/)).toBeVisible()
})
