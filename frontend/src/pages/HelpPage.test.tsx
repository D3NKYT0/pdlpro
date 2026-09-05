// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HelpPage } from './HelpPage'
import { resetHttpClient } from '../services/infra/http'
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', username: 'daniel', display_name: 'Daniel', role: 'player', email: 'd@example.com', bio: '', is_email_verified: true, fichas: 0, avatar_url: null } }),
}))
const articles = [{ id: '1', question: 'Como recuperar minha senha?', short_answer: 'Use a recuperação.', answer: 'Use a recuperação na tela de login.', category: 'account_security', category_label: 'Conta e segurança', keywords: ['senha', 'reset'] }]
const assistantReply = { language: 'pt', kind: 'knowledge', engine: 'sentence-transformers+rapidfuzz', confidence: 0.91, article_id: '1', answer: { text: articles[0].short_answer, details: articles[0].answer, source: articles[0].question, pose: '04-dica' } }
const petProfile = { level: 1, experience: 0, experience_next: 100, attributes: { satiety: 75, energy: 75, happiness: 75, hygiene: 75 } }
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const apiResponse = (input: RequestInfo | URL) => {
  const url = String(input)
  if (url.includes('/auth/csrf/')) return response({ csrfToken: 'test-csrf' })
  if (url.includes('/assistant/reply/')) return response(assistantReply)
  if (url.includes('/assistant/pet/')) return response(petProfile)
  return response(articles)
}
let client: QueryClient
let fetcher: ReturnType<typeof vi.fn>
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  fetcher = vi.fn().mockImplementation((input: RequestInfo | URL) => Promise.resolve(apiResponse(input)))
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('Image', class { onload: null | (() => void) = null; onerror = null; set src(_: string) { Promise.resolve().then(() => this.onload?.()) } })
})
afterEach(() => { cleanup(); client.clear(); resetHttpClient(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
async function openCompanion(user = userEvent.setup()) { if (!screen.queryByRole('dialog')) await user.click(screen.getByRole('button', { name: /Denkynho: / })) }
function mount() { render(<QueryClientProvider client={client}><MemoryRouter><HelpPage /></MemoryRouter></QueryClientProvider>); return userEvent.setup() }
it('mostra atributos persistentes, envia um cuidado idempotente e bloqueia duplo clique', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await openCompanion(user); await screen.findByText('Nível 1')
  expect(screen.getByLabelText('Saciedade')).toHaveValue(75)
  let resolveCare!: (value: Response) => void
  fetcher.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => String(input).includes('/assistant/pet/') && init?.method === 'POST'
    ? new Promise<Response>(resolve => { resolveCare = resolve })
    : Promise.resolve(apiResponse(input)))
  const feed = screen.getByRole('button', { name: 'Alimentar' })
  await user.dblClick(feed)
  expect(feed).toBeDisabled()
  expect(fetcher.mock.calls.filter(([url, init]) => String(url).includes('/assistant/pet/') && (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(1)
  const call = fetcher.mock.calls.find(([url, init]) => String(url).includes('/assistant/pet/') && (init as RequestInit | undefined)?.method === 'POST')!
  expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ action: 'feed', idempotency_key: expect.stringMatching(/^[0-9a-f-]{36}$/) })
  const updated = { ...petProfile, experience: 12, attributes: { ...petProfile.attributes, satiety: 100, happiness: 80 }, action: 'feed', xp_gained: 12, replayed: false }
  resolveCare(response(updated))
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/pet/') ? response(updated) : apiResponse(input)))
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-pose', '11-comendo'))
  expect(screen.getByLabelText('Saciedade')).toHaveValue(100)
})
it('dá banho, aumenta a higiene confirmada pela API e reproduz o atlas próprio', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await openCompanion(user); await screen.findByText('Nível 1')
  const updated = { ...petProfile, experience: 12, attributes: { ...petProfile.attributes, hygiene: 100 }, attributes_gained: { hygiene: 25 }, action: 'bath', xp_gained: 12, replayed: false }
  let bathed = false
  fetcher.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    if (!String(input).includes('/assistant/pet/')) return Promise.resolve(apiResponse(input))
    if (init?.method === 'POST') { bathed = true; return Promise.resolve(response(updated)) }
    return Promise.resolve(response(bathed ? updated : petProfile))
  })
  await user.click(screen.getByRole('button', { name: 'Dar banho' }))
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-pose', '15-banho'))
  expect(screen.getByRole('img')).toHaveAccessibleName('Denkynho — Tomando banho')
  const request = fetcher.mock.calls.find(([url, init]) => String(url).includes('/assistant/pet/') && (init as RequestInit | undefined)?.method === 'POST')!
  expect(JSON.parse((request[1] as RequestInit).body as string)).toMatchObject({ action: 'bath' })
  expect(screen.getByLabelText('Higiene')).toHaveValue(100)
})
it('caminha no atlas próprio e aplica o custo de energia confirmado pela API', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await openCompanion(user); await screen.findByText('Nível 1')
  const updated = { ...petProfile, experience: 8, attributes: { ...petProfile.attributes, energy: 70, happiness: 83 }, attributes_gained: { energy: -5, happiness: 8 }, action: 'walk', xp_gained: 8, replayed: false }
  let walked = false
  fetcher.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    if (!String(input).includes('/assistant/pet/')) return Promise.resolve(apiResponse(input))
    if (init?.method === 'POST') { walked = true; return Promise.resolve(response(updated)) }
    return Promise.resolve(response(walked ? updated : petProfile))
  })
  await user.click(screen.getByRole('button', { name: 'Caminhar' }))
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-pose', '16-andando'))
  expect(screen.getByRole('img')).toHaveAccessibleName('Denkynho — Caminhando')
  const request = fetcher.mock.calls.find(([url, init]) => String(url).includes('/assistant/pet/') && (init as RequestInit | undefined)?.method === 'POST')!
  expect(JSON.parse((request[1] as RequestInit).body as string)).toMatchObject({ action: 'walk' })
  expect(screen.getByLabelText('Energia')).toHaveValue(70)
})
it('reserva a cama para a ação Dormir e entra em ociosidade sem acumular timers', async () => {
  mount(); await screen.findByRole('button', { name: articles[0].question }); await openCompanion(); await screen.findByText('Nível 1')
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await openCompanion()
  await user.click(screen.getByRole('button', { name: 'Dormir' }))
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-pose', '05-dormindo'))
  await act(async () => { await vi.advanceTimersByTimeAsync(8000) })
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '01-boas-vindas')
  await act(async () => { await vi.advanceTimersByTimeAsync(45000) })
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '01-boas-vindas')
  expect(screen.getByRole('img')).toHaveAttribute('data-idle', 'true')
  expect(screen.getAllByText('Curtindo um momento tranquilo.')).toHaveLength(2)
  cleanup(); client.clear()
  expect(vi.getTimerCount()).toBe(0)
})
it('mantém atividades manuais estáticas e não inicia atividades automáticas com movimento reduzido', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  mount(); await screen.findByRole('button', { name: articles[0].question })
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await openCompanion()
  await user.click(screen.getByRole('button', { name: 'Brincar' }))
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-pose', '12-jogando'))
  expect(screen.getByRole('img')).toHaveAttribute('data-animated', 'false')
  await act(async () => { await vi.advanceTimersByTimeAsync(34000) })
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '01-boas-vindas')
  await openCompanion()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en')
  expect(screen.getByRole('button', { name: 'Feed' })).toBeEnabled()
})
it('carrega a base por HTTP e oferece chat, FAQ e atendimento', async () => {
  mount(); expect(screen.getByText('Carregando perguntas de ajuda…')).toBeVisible()
  expect(await screen.findByRole('button', { name: articles[0].question })).toBeVisible()
  expect(String(fetcher.mock.calls[0][0])).toContain('/shared/content/faq/')
  expect(screen.getByText(/(Bom dia|Boa tarde|Boa noite), Daniel!/)).toBeVisible()
  expect(screen.getByText(/sessão de jogador/i)).toBeVisible()
  expect(screen.getByRole('link', { name: 'Atendimento da equipe' })).toHaveAttribute('href', '/painel/support')
  expect(screen.getByRole('textbox', { name: 'Sua mensagem' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeVisible()
  expect(screen.getByText(/Enter envia/)).toBeInTheDocument()
  await openCompanion()
  expect(screen.getByRole('link', { name: 'Consultar o FAQ' })).toHaveAttribute('href', '/faq')
  expect(screen.getByRole('combobox', { name: 'Assunto' })).toHaveValue('all')
})
it('bloqueia apelido ofensivo mesmo disfarçado e não o repete na conversa', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  const input = screen.getByRole('textbox', { name: 'Sua mensagem' })
  await user.type(input, 'Pode me chamar de r.0.l.4')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  expect(screen.getByRole('alert')).toHaveTextContent('não pode ser usada no chat')
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '10-frustrado')
  expect(within(screen.getByRole('log')).queryByText(/r\.0\.l\.4/i)).not.toBeInTheDocument()
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('envia a mensagem com Enter e usa Shift+Enter para nova linha', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  const input = screen.getByRole('textbox', { name: 'Sua mensagem' })
  await user.type(input, 'primeira{Shift>}{Enter}{/Shift}segunda')
  expect(input).toHaveValue('primeira\nsegunda')
  await user.clear(input)
  await user.type(input, 'Olá, como vai?{Enter}')
  await user.click(await screen.findByRole('button', { name: 'Mostrar resposta completa' }))
  expect(screen.getByText(/Estou bem e com energia/)).toBeVisible()
  expect(input).toHaveValue('')
  expect(fetcher).toHaveBeenCalledTimes(4)
})
it('responde conversa simples com a personalidade sem consultar novamente o FAQ', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Olá, como vai?')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  await user.click(await screen.findByRole('button', { name: 'Mostrar resposta completa' }))
  expect(screen.getByText(/Estou bem e com energia/)).toBeVisible()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '02-sucesso')
  expect(fetcher).toHaveBeenCalledTimes(4)
})
it('troca a interface e a personalidade para inglês e recarrega o FAQ localizado', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await openCompanion()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en')
  expect(await screen.findByRole('heading', { name: 'Help' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Your message' })).toHaveAttribute('placeholder', 'Type your question…')
  expect(fetcher.mock.calls.some(call => String(call[0]).includes('/shared/content/faq/?lang=en'))).toBe(true)
  await user.type(screen.getByRole('textbox', { name: 'Your message' }), 'Hello')
  await user.click(screen.getByRole('button', { name: 'Send message' }))
  await user.click(await screen.findByRole('button', { name: 'Show full response' }))
  expect(screen.getByText("Hi! I'm Denkynho. How can I help you on your PDL journey?")).toBeVisible()
})
it('continua uma orientação usando contexto sem consultar novamente o FAQ', async () => {
  const user = mount(); await openCompanion(user); await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  await user.click(await screen.findByRole('button', { name: articles[0].question }))
  expect(await screen.findByText(articles[0].short_answer)).toBeVisible()
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Mais detalhes')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  expect(await screen.findByText(articles[0].answer)).toBeVisible()
  expect(screen.getByText(/Isso esclareceu/)).toBeVisible()
  expect(fetcher).toHaveBeenCalledTimes(5)
})
it('envia sugestão, revela a fala, abre a orientação completa e reinicia a conversa', async () => {
  const user = mount(); await user.click(await screen.findByRole('button', { name: articles[0].question }))
  await user.click(await screen.findByRole('button', { name: 'Mostrar resposta completa' }))
  const log = screen.getByRole('log')
  expect(within(log).getByText(articles[0].short_answer)).toBeVisible()
  await user.click(within(log).getByRole('button', { name: 'Ver orientação completa' }))
  expect(within(log).getByText(articles[0].answer)).toBeVisible()
  expect(within(log).getByText(`Fonte: ${articles[0].question}`)).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Sua mensagem' })).toHaveValue('')
  await user.click(screen.getByRole('button', { name: 'Nova conversa' }))
  expect(within(log).queryByText(articles[0].answer)).not.toBeInTheDocument()
})
it('bloqueia envio duplicado durante a consulta e mantém o rascunho na falha', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  let resolve!: (r: Response) => void
  fetcher.mockImplementation((input: RequestInfo | URL) => String(input).includes('/assistant/reply/') ? new Promise<Response>(r => { resolve = r }) : Promise.resolve(apiResponse(input)))
  const input = screen.getByRole('textbox', { name: 'Sua mensagem' }); await user.type(input, 'Minha senha')
  await user.dblClick(screen.getByRole('button', { name: 'Enviar mensagem' }))
  expect(fetcher).toHaveBeenCalledTimes(4)
  expect(input).toBeEnabled(); expect(screen.getByText('Consultando a base de ajuda…')).toBeVisible()
  resolve(response({ message: 'Consulta indisponível' }, 400))
  expect(await screen.findByRole('alert')).toHaveTextContent('Consulta indisponível')
  expect(input).toHaveValue('Minha senha'); expect(input).toBeEnabled()
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(apiResponse(input)))
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  await user.click(await screen.findByRole('button', { name: 'Mostrar resposta completa' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('trata base vazia e mensagem sem correspondência sem inventar resposta', async () => {
  fetcher.mockImplementation((input: RequestInfo | URL) => String(input).includes('/assistant/reply/') ? Promise.resolve(response({ language: 'pt', kind: 'unknown', engine: 'rapidfuzz', confidence: 0, related_ids: [], answer: { text: 'Não encontrei uma resposta segura para essa pergunta na nossa base.', pose: '09-confuso' } })) : Promise.resolve(String(input).includes('/auth/csrf/') ? response({ csrfToken: 'test-csrf' }) : String(input).includes('/assistant/pet/') ? response(petProfile) : response([])))
  const user = mount(); expect(await screen.findByText(/Ainda não há perguntas publicadas/)).toBeVisible()
  await openCompanion()
  await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Meu personagem sumiu')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  expect(await screen.findByText(/Não encontrei uma resposta segura/)).toBeVisible()
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-pose', '09-confuso'))
})
it('permite tentar novamente após resposta inválida da base', async () => {
  fetcher.mockImplementationOnce(() => Promise.resolve(response({ invalid: true })))
  const user = mount(); expect(await screen.findByRole('alert')).toHaveTextContent('resposta inválida')
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('button', { name: articles[0].question })).toBeVisible()
})
it('respeita movimento reduzido e exibe a resposta completa sem animação', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const user = mount(); await openCompanion(user); expect(screen.getByRole('checkbox', { name: 'Animar personagem' })).toBeDisabled()
  await user.click(await screen.findByRole('button', { name: articles[0].question }))
  expect(await screen.findByText(articles[0].short_answer)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Ver orientação completa' }))
  expect(screen.getByText(articles[0].answer)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Mostrar resposta completa' })).not.toBeInTheDocument()
})
it('não entra em ociosidade enquanto há rascunho e termina a fala automaticamente', async () => {
  fetcher.mockImplementation((input: RequestInfo | URL) => String(input).includes('/assistant/reply/') ? Promise.resolve(response({ ...assistantReply, answer: { text: 'Ok.', pose: '04-dica' } })) : Promise.resolve(String(input).includes('/auth/csrf/') ? response({ csrfToken: 'test-csrf' }) : String(input).includes('/assistant/pet/') ? response(petProfile) : response([{ ...articles[0], short_answer: 'Ok.', answer: 'Ok.' }])))
  mount(); await screen.findByRole('button', { name: articles[0].question })
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'senha')
  await act(async () => { await vi.advanceTimersByTimeAsync(45000) })
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '01-boas-vindas')
  expect(screen.getByRole('img')).toHaveAttribute('data-idle', 'false')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(100) })
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '04-dica')
  expect(screen.getByText('Ok.')).toBeVisible()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Mostrar resposta completa' })).not.toBeInTheDocument())
})

it('preserva o rascunho quando o assistente devolve um contrato inválido', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/reply/') ? response({ invalid: true }) : apiResponse(input)))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'recuperar senha')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível consultar a ajuda.')
  expect(screen.getByRole('textbox', { name: 'Sua mensagem' })).toHaveValue('recuperar senha')
})

it('mantém a preferência de detalhes nas respostas do servidor', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await openCompanion()
  await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Quero respostas detalhadas{Enter}')
  await screen.findByText(/Vou trazer a orientação completa/)
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'recuperar senha{Enter}')
  expect(await screen.findByText(articles[0].answer)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Ver orientação completa' })).not.toBeInTheDocument()
})

it('aceita reparação social do backend sem repetir fonte e resposta do FAQ anterior', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await openCompanion()
  await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  await user.click(screen.getByRole('button', { name: articles[0].question }))
  await screen.findByText(articles[0].short_answer)
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/reply/') ? response({ kind: 'social', language: 'pt', engine: 'rapidfuzz', answer: { text: 'Desculpa, interpretei errado. Eu sou o Denkynho!', pose: '01-boas-vindas' } }) : apiResponse(input)))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'mas eu pedi pra vc me falar sobre voce{Enter}')
  expect(await screen.findByText('Desculpa, interpretei errado. Eu sou o Denkynho!')).toBeVisible()
  expect(screen.getAllByText(articles[0].short_answer)).toHaveLength(1)
  expect(screen.getAllByText(`Fonte: ${articles[0].question}`)).toHaveLength(1)
  const call = fetcher.mock.calls.filter(call => String(call[0]).includes('/assistant/reply/')).at(-1)!
  expect(JSON.parse(call[1].body)).toEqual({ message: 'mas eu pedi pra vc me falar sobre voce', language: 'pt', conversation: true, context: '', screen: '/painel/ajuda' })
})

it('usa geração também para cumprimentos, mantém contexto e o limpa em nova conversa', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await openCompanion()
  await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  const generated = { kind: 'social', language: 'pt', engine: 'ollama', mode: 'generative', context: 'signed-turn-1', answer: { text: 'Oi, Dani! Como foi seu dia?', pose: '02-sucesso' } }
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/reply/') ? response(generated) : apiResponse(input)))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Oi{Enter}')
  expect(await screen.findByText(generated.answer.text)).toBeVisible()
  expect(screen.queryByText(/ajuda básica/)).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-pose', '02-sucesso'))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'estou cansado{Enter}')
  await waitFor(() => expect(screen.getAllByText(generated.answer.text)).toHaveLength(2))
  const calls = () => fetcher.mock.calls.filter(call => String(call[0]).includes('/assistant/reply/')).map(call => JSON.parse(call[1].body))
  expect(calls()).toEqual([
    { message: 'Oi', language: 'pt', conversation: true, context: '', screen: '/painel/ajuda' },
    { message: 'estou cansado', language: 'pt', conversation: true, context: 'signed-turn-1', screen: '/painel/ajuda' },
  ])
  await user.click(screen.getByRole('button', { name: 'Nova conversa' }))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'oi{Enter}')
  await screen.findByText(generated.answer.text)
  expect(calls().at(-1).context).toBe('')
  await openCompanion()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en')
  await user.type(screen.getByRole('textbox', { name: 'Your message' }), 'Hello{Enter}')
  await screen.findByText(generated.answer.text)
  expect(calls().at(-1)).toMatchObject({ language: 'en', context: '' })
})

it('aceita geração pela API remota no mesmo contrato da conversa', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  const generated = { kind: 'social', language: 'pt', engine: 'remote', mode: 'generative', context: 'signed-remote', answer: { text: 'Oi pela API remota!', pose: '01-boas-vindas' } }
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/reply/') ? response(generated) : apiResponse(input)))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Oi{Enter}')
  expect(await screen.findByText(generated.answer.text)).toBeVisible()
  expect(screen.queryByText(/ajuda básica/)).not.toBeInTheDocument()
})

it('informa ajuda básica quando a geração falha e permite recuperar a conversa', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await openCompanion()
  await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/reply/') ? response({ ...assistantReply, mode: 'limited', context: '' }) : apiResponse(input)))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'senha{Enter}')
  expect(await screen.findByText(/Estou no modo de ajuda básica/)).toBeVisible()
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/reply/') ? response({ ...assistantReply, engine: 'ollama', mode: 'generative', context: 'ok' }) : apiResponse(input)))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'senha{Enter}')
  await waitFor(() => expect(screen.queryByText(/Estou no modo de ajuda básica/)).not.toBeInTheDocument())
})

it('recusa contexto inválido sem apagar o rascunho', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/reply/') ? response({ ...assistantReply, context: 123 }) : apiResponse(input)))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'senha{Enter}')
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível consultar a ajuda.')
  expect(screen.getByRole('textbox', { name: 'Sua mensagem' })).toHaveValue('senha')
})

it('mostra o humor segundo as necessidades e permanece empático depois da conversa', async () => {
  const hungry = {
    ...petProfile,
    attributes: { ...petProfile.attributes, satiety: 8 },
    emotion: { id: 'sad', pose: '07-triste', idle_pose: '07-triste', source: 'needs' },
  }
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/pet/') ? response(hungry) : apiResponse(input)))
  const user = mount()
  await screen.findByRole('button', { name: articles[0].question })
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-pose', '07-triste'))
  await openCompanion(user)
  expect(screen.getByText('Humor: Triste')).toBeVisible()
  expect(screen.getAllByText('Precisa de um pouco de cuidado.')).toHaveLength(2)
  await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  const empathic = {
    kind: 'social', language: 'pt', engine: 'ollama', mode: 'generative', context: 'signed',
    answer: { text: 'Estou aqui com você.', pose: '07-triste' },
    emotion: { id: 'sad', pose: '07-triste', idle_pose: '07-triste', source: 'user' },
  }
  fetcher.mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes('/assistant/reply/') ? response(empathic) : String(input).includes('/assistant/pet/') ? response(hungry) : apiResponse(input)))
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Hoje estou triste{Enter}')
  expect(await screen.findByText('Estou aqui com você.')).toBeVisible()
  await openCompanion(user)
  expect(screen.getByText('Acompanha o que você sente')).toBeVisible()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '07-triste')
})
