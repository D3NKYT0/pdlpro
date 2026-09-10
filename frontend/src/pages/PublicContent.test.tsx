// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { contentApi } from '../services/api'
import { FaqPage } from './FaqPage'
import { DownloadsPage } from './DownloadsPage'
import { NewsPage } from './NewsPage'
import { NewsDetailPage } from './NewsDetailPage'
import { WikiPage } from './WikiPage'
import { WikiDetailPage } from './WikiDetailPage'
import { CalendarPage } from './CalendarPage'
import { LegalPage } from './LegalPage'
import { CookieConsentProvider } from '../contexts/CookieConsentContext'

vi.mock('../services/domain/content.service', () => ({ contentApi: { faq: vi.fn(), downloads: vi.fn(), news: vi.fn(), newsDetail: vi.fn(), wiki: vi.fn(), wikiPage: vi.fn(), calendar: vi.fn(), legalDocument: vi.fn(), legalHistory: vi.fn() } }))
beforeEach(() => { vi.resetAllMocks() })
afterEach(cleanup)
function mount(page: ReactElement, url = '/', path = '*') {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[url]}><CookieConsentProvider><Routes><Route path={path} element={page} /></Routes></CookieConsentProvider></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it('FAQ abre e fecha respostas com estado acessível', async () => {
  vi.mocked(contentApi.faq).mockResolvedValue([
    { id: '1', question: 'Como jogar?', short_answer: 'Baixe o cliente.', answer: 'Baixe o cliente.', category: 'getting_started', category_label: 'Primeiros passos', keywords: ['cliente'], audience: 'public', audience_label: 'Todos os usuários' },
    { id: '2', question: 'Como doar?', short_answer: 'Use a carteira.', answer: 'Use a carteira.', category: 'economy', category_label: 'Carteira e inventário', keywords: ['saldo'], audience: 'public', audience_label: 'Todos os usuários' },
  ])
  const user = mount(<FaqPage />)
  expect(await screen.findByText('Baixe o cliente.')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Como doar?' }))
  expect(screen.queryByText('Baixe o cliente.')).toBeNull()
  expect(screen.getByText('Use a carteira.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Como doar?' }).getAttribute('aria-expanded')).toBe('true')
  await user.click(screen.getByRole('button', { name: 'Como doar?' }))
  expect(screen.queryByText('Use a carteira.')).toBeNull()
})

it('downloads agrupam categoria vazia em Cliente e preservam link', async () => {
  vi.mocked(contentApi.downloads).mockResolvedValue([{ id: '1', title: 'Instalador', url: 'https://files.test/client.zip', category: ' ' }, { id: '2', title: 'Patch', url: 'https://files.test/patch.zip', category: 'Patches' }])
  mount(<DownloadsPage />)
  const link = await screen.findByRole('link', { name: /Instalador/ })
  expect(link.getAttribute('href')).toBe('https://files.test/client.zip')
  expect(link.getAttribute('rel')).toContain('noreferrer')
  expect(screen.getByRole('heading', { name: 'Cliente' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Patches' })).toBeTruthy()
})

it('notícias apontam para o slug e mostram resumo publicado', async () => {
  vi.mocked(contentApi.news).mockResolvedValue([{ id: '1', slug: 'update', title: 'Atualização', excerpt: 'Novo conteúdo', published_at: '2026-09-02T12:00:00Z' }] as any)
  mount(<NewsPage />)
  expect((await screen.findByRole('link', { name: /Atualização/ })).getAttribute('href')).toBe('/news/update')
  expect(screen.getByText('Novo conteúdo')).toBeTruthy()
})

it('busca da wiki atualiza consulta e links', async () => {
  vi.mocked(contentApi.wiki).mockResolvedValue([{ id: '1', slug: 'siege', title: 'Guia Siege', summary: 'Conquiste castelos', category: 'Guias' }] as any)
  const user = mount(<WikiPage />)
  expect((await screen.findByRole('link', { name: /Guia Siege/ })).getAttribute('href')).toBe('/wiki/siege')
  await user.type(screen.getByRole('textbox', { name: 'Buscar na wiki' }), 'siege')
  await waitFor(() => expect(contentApi.wiki).toHaveBeenLastCalledWith('siege', 'pt'))
})

it.each([
  ['faq', <FaqPage />, 'Nenhuma pergunta publicada no momento.'],
  ['downloads', <DownloadsPage />, 'Nenhum download publicado no momento.'],
  ['news', <NewsPage />, 'Nenhuma notícia publicada no momento.'],
  ['calendar', <CalendarPage />, 'Nenhum evento publicado.'],
] as const)('estado vazio de %s', async (method, page, message) => {
  vi.mocked(contentApi[method]).mockResolvedValue([])
  mount(page)
  expect(await screen.findByText(message)).toBeTruthy()
})

it('detalhe de notícia renderiza HTML seguro e remove script', async () => {
  vi.mocked(contentApi.newsDetail).mockResolvedValue({
    title: 'Guia',
    body: '<p>Olá mundo</p><script>alert(1)</script>',
    summary: 'Resumo',
    category: 'Geral',
  } as any)
  mount(<NewsDetailPage />, '/news/guide', '/news/:slug')
  expect(await screen.findByText('Olá mundo')).toBeTruthy()
  expect(contentApi.newsDetail).toHaveBeenCalledWith('guide', 'pt')
  expect(document.querySelector('script')).toBeNull()
})

it('detalhe da wiki apresenta conteúdo como texto escapado', async () => {
  vi.mocked(contentApi.wikiPage).mockResolvedValue({ title: 'Guia', body: '<script>alert(1)</script>', summary: 'Resumo', category: 'Geral' } as any)
  mount(<WikiDetailPage />, '/wiki/guide', '/wiki/:slug')
  expect(await screen.findByText('<script>alert(1)</script>')).toBeTruthy()
  expect(contentApi.wikiPage).toHaveBeenCalledWith('guide', 'pt')
  expect(document.querySelector('script')).toBeNull()
})

it.each(['/terms', '/privacy', '/agreement', '/cookies', '/lgpd'])('documento legal acompanha rota %s', async url => {
  const slug = url === '/lgpd' ? 'lgpd' : url.slice(1)
  vi.mocked(contentApi.legalDocument).mockResolvedValue({
    slug,
    title: 'Documento',
    body: '<p>Texto oficial</p><h2>Seção</h2>',
    version: 'v2',
    format: 'html',
  })
  mount(<LegalPage />, url)
  expect(await screen.findByText('Texto oficial')).toBeTruthy()
  expect(contentApi.legalDocument).toHaveBeenCalledWith(slug, 'pt')
  expect(screen.getByText('Versão v2')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Seção' })).toBeTruthy()
})

it('calendário mostra título e descrição do evento', async () => {
  vi.mocked(contentApi.calendar).mockResolvedValue([{ id: '1', title: 'Siege', description: 'Prepare seu clã', starts_at: '2026-09-02T12:00:00Z', ends_at: '2026-09-02T14:00:00Z', color: 'gold' }])
  mount(<CalendarPage />)
  expect(await screen.findByRole('heading', { name: 'Siege' })).toBeTruthy()
  expect(screen.getByText('Prepare seu clã')).toBeTruthy()
})
