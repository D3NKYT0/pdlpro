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

vi.mock('../services/domain/content.service', () => ({ contentApi: { faq: vi.fn(), downloads: vi.fn(), news: vi.fn(), newsDetail: vi.fn(), wiki: vi.fn(), wikiPage: vi.fn(), calendar: vi.fn(), legalDocument: vi.fn() } }))
beforeEach(() => { vi.resetAllMocks() })
afterEach(cleanup)
function mount(page: ReactElement, url = '/', path = '*') {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={page} /></Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

it('FAQ abre e fecha respostas com estado acessível', async () => {
  vi.mocked(contentApi.faq).mockResolvedValue([{ id: '1', question: 'Como jogar?', answer: 'Baixe o cliente.' }, { id: '2', question: 'Como doar?', answer: 'Use a carteira.' }])
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
  await waitFor(() => expect(contentApi.wiki).toHaveBeenLastCalledWith('siege'))
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

it.each(['news', 'wiki'] as const)('detalhe de %s usa slug e apresenta conteúdo como texto', async kind => {
  const method = kind === 'news' ? contentApi.newsDetail : contentApi.wikiPage
  vi.mocked(method).mockResolvedValue({ title: 'Guia', body: '<script>alert(1)</script>', summary: 'Resumo', category: 'Geral' } as any)
  mount(kind === 'news' ? <NewsDetailPage /> : <WikiDetailPage />, `/${kind}/guide`, `/${kind}/:slug`)
  expect(await screen.findByText('<script>alert(1)</script>')).toBeTruthy()
  expect(method).toHaveBeenCalledWith('guide')
  expect(document.querySelector('script')).toBeNull()
})

it.each(['/terms', '/privacy', '/agreement'])('documento legal acompanha rota %s', async url => {
  vi.mocked(contentApi.legalDocument).mockResolvedValue({ slug: url.slice(1), title: 'Documento', body: 'Texto oficial', version: 'v2' })
  mount(<LegalPage />, url)
  expect(await screen.findByText('Texto oficial')).toBeTruthy()
  expect(contentApi.legalDocument).toHaveBeenCalledWith(url.slice(1))
  expect(screen.getByText('Versão v2')).toBeTruthy()
})

it('calendário mostra título e descrição do evento', async () => {
  vi.mocked(contentApi.calendar).mockResolvedValue([{ id: '1', title: 'Siege', description: 'Prepare seu clã', starts_at: '2026-09-02T12:00:00Z', ends_at: '2026-09-02T14:00:00Z', color: 'gold' }])
  mount(<CalendarPage />)
  expect(await screen.findByRole('heading', { name: 'Siege' })).toBeTruthy()
  expect(screen.getByText('Prepare seu clã')).toBeTruthy()
})
