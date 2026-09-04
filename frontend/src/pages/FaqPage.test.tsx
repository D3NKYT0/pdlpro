// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { FaqPage } from './FaqPage'
import { resetHttpClient } from '../services/infra/http'

const rows = [
  { id: '1', question: 'Como recupero a senha?', short_answer: 'Use a recuperação.', answer: 'Abra Esqueci minha senha.', category: 'account_security', category_label: 'Conta e segurança', keywords: ['reset'] },
  { id: '2', question: 'Como funciona a carteira?', short_answer: 'Veja seus saldos.', answer: 'Abra a Carteira no painel.', category: 'economy', category_label: 'Carteira e inventário', keywords: ['moedas'] },
]
let client: QueryClient

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } })))
})
afterEach(() => { cleanup(); client.clear(); resetHttpClient(); vi.unstubAllGlobals() })

it('busca no conteúdo e filtra o FAQ por assunto', async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={client}><FaqPage /></QueryClientProvider>)
  expect(await screen.findByRole('button', { name: /Como recupero a senha/ })).toBeVisible()
  expect(screen.getByRole('button', { name: /Como funciona a carteira/ })).toBeVisible()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Assunto' }), 'economy')
  expect(screen.queryByRole('button', { name: /Como recupero a senha/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Como funciona a carteira/ })).toBeVisible()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Assunto' }), 'all')
  await user.type(screen.getByRole('searchbox', { name: 'Buscar no FAQ' }), 'reset')
  expect(screen.getByRole('button', { name: /Como recupero a senha/ })).toBeVisible()
  expect(screen.queryByRole('button', { name: /Como funciona a carteira/ })).not.toBeInTheDocument()
})

it('mostra categoria e resposta completa ao abrir um artigo', async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={client}><FaqPage /></QueryClientProvider>)
  const question = await screen.findByRole('button', { name: /Como recupero a senha/ })
  expect(question).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getAllByText('Conta e segurança')).toHaveLength(2)
  expect(screen.getByText('Abra Esqueci minha senha.')).toBeVisible()
  await user.click(question)
  expect(screen.queryByText('Abra Esqueci minha senha.')).not.toBeInTheDocument()
})
