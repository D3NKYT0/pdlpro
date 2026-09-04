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
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
let client: QueryClient
let fetcher: ReturnType<typeof vi.fn>
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  fetcher = vi.fn().mockImplementation(() => Promise.resolve(response(articles)))
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('Image', class { onload: null | (() => void) = null; onerror = null; set src(_: string) { Promise.resolve().then(() => this.onload?.()) } })
})
afterEach(() => { cleanup(); client.clear(); resetHttpClient(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
function mount() { render(<QueryClientProvider client={client}><MemoryRouter><HelpPage /></MemoryRouter></QueryClientProvider>); return userEvent.setup() }
it('carrega a base por HTTP e oferece chat, FAQ e atendimento', async () => {
  mount(); expect(screen.getByText('Carregando perguntas de ajuda…')).toBeVisible()
  expect(await screen.findByRole('button', { name: articles[0].question })).toBeVisible()
  expect(String(fetcher.mock.calls[0][0])).toContain('/shared/content/faq/')
  expect(screen.getByText(/(Bom dia|Boa tarde|Boa noite), Daniel!/)).toBeVisible()
  expect(screen.getByText(/sessão de jogador/i)).toBeVisible()
  expect(screen.getByRole('link', { name: 'Atendimento da equipe' })).toHaveAttribute('href', '/painel/support')
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
  expect(fetcher).toHaveBeenCalledTimes(1)
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
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('responde conversa simples com a personalidade sem consultar novamente o FAQ', async () => {
  const user = mount(); await screen.findByRole('button', { name: articles[0].question })
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Olá, como vai?')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  await user.click(await screen.findByRole('button', { name: 'Mostrar resposta completa' }))
  expect(screen.getByText(/Estou bem e com energia/)).toBeVisible()
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '02-sucesso')
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('continua uma orientação usando contexto sem consultar novamente o FAQ', async () => {
  const user = mount(); await user.click(screen.getByRole('checkbox', { name: 'Animar personagem' }))
  await user.click(await screen.findByRole('button', { name: articles[0].question }))
  expect(await screen.findByText(articles[0].short_answer)).toBeVisible()
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'Mais detalhes')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  expect(await screen.findByText(articles[0].answer)).toBeVisible()
  expect(screen.getByText(/Isso esclareceu/)).toBeVisible()
  expect(fetcher).toHaveBeenCalledTimes(2)
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
  fetcher.mockImplementationOnce(() => new Promise<Response>(r => { resolve = r }))
  const input = screen.getByRole('textbox', { name: 'Sua mensagem' }); await user.type(input, 'Minha senha')
  await user.dblClick(screen.getByRole('button', { name: 'Enviar mensagem' }))
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(input).toBeDisabled(); expect(screen.getByText('Consultando a base de ajuda…')).toBeVisible()
  resolve(response({ message: 'Consulta indisponível' }, 400))
  expect(await screen.findByRole('alert')).toHaveTextContent('Consulta indisponível')
  expect(input).toHaveValue('Minha senha'); expect(input).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  await user.click(await screen.findByRole('button', { name: 'Mostrar resposta completa' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('trata base vazia e mensagem sem correspondência sem inventar resposta', async () => {
  fetcher.mockImplementation(() => Promise.resolve(response([])))
  const user = mount(); expect(await screen.findByText(/Ainda não há perguntas publicadas/)).toBeVisible()
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
  const user = mount(); expect(screen.getByRole('checkbox', { name: 'Animar personagem' })).toBeDisabled()
  await user.click(await screen.findByRole('button', { name: articles[0].question }))
  expect(await screen.findByText(articles[0].short_answer)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Ver orientação completa' }))
  expect(screen.getByText(articles[0].answer)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Mostrar resposta completa' })).not.toBeInTheDocument()
})
it('descansa após inatividade, acorda ao enviar e termina a fala automaticamente', async () => {
  fetcher.mockImplementation(() => Promise.resolve(response([{ ...articles[0], short_answer: 'Ok.', answer: 'Ok.' }])))
  mount(); await screen.findByRole('button', { name: articles[0].question })
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.type(screen.getByRole('textbox', { name: 'Sua mensagem' }), 'senha')
  await act(async () => { await vi.advanceTimersByTimeAsync(45000) })
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '05-dormindo')
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(100) })
  expect(screen.getByRole('img')).toHaveAttribute('data-pose', '04-dica')
  expect(screen.getByText('Ok.')).toBeVisible()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Mostrar resposta completa' })).not.toBeInTheDocument())
})
