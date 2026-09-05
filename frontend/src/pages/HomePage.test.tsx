// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { contentApi, serverApi } from '../services/api'
import { HomePage } from './HomePage'

vi.mock('../theme/ThemeProvider', () => ({
  useTheme: () => ({ presentation: null }),
}))
vi.mock('../services/domain/content.service', () => ({
  contentApi: { news: vi.fn(), wiki: vi.fn() },
}))
vi.mock('../services/domain/server.service', () => ({
  serverApi: { status: vi.fn(), rankings: vi.fn() },
}))

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(serverApi.status).mockResolvedValue({ players_online: 12, game_online: true, login_online: true } as never)
  vi.mocked(serverApi.rankings).mockResolvedValue([{ position: 1, name: 'Dawn', value: 9800 }])
  vi.mocked(contentApi.news).mockResolvedValue([])
  vi.mocked(contentApi.wiki).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('exibe pilares autênticos do Lineage com destinos reais', async () => {
  mount()

  expect(await screen.findByRole('heading', { name: /Crônica, castelos e a glória que definem o Lineage/i })).toBeVisible()
  expect(screen.getByText('No mundo de Aden')).toBeVisible()

  const rates = screen.getByRole('link', { name: /Crônica e Rates/i })
  const siege = screen.getByRole('link', { name: /Guerra de Castelos/i })
  const fame = screen.getByRole('link', { name: /Hall da Fama/i })

  expect(rates).toHaveAttribute('href', '/informacoes#rates')
  expect(siege).toHaveAttribute('href', '/informacoes#pvp')
  expect(fame).toHaveAttribute('href', '/rankings')

  expect(screen.getByText('Progressão, economia e o ritmo do reino')).toBeVisible()
  expect(screen.getByText('Siege, clãs e o domínio de Aden')).toBeVisible()
  expect(screen.getByText('PvP, olimpíada e os melhores clãs')).toBeVisible()

  expect(screen.queryByText('Missões Personalizadas')).not.toBeInTheDocument()
  expect(screen.queryByText('Eventos e Recompensas')).not.toBeInTheDocument()
  expect(screen.queryByText(/servidor mais atualizado, moderno e estável/i)).not.toBeInTheDocument()
})

it('usa arte de castelos do tema nos cards de destaque', async () => {
  mount()
  await screen.findByRole('link', { name: /Crônica e Rates/i })

  const cards = [...document.querySelectorAll('.home-features .f-list a > div')].map((node) => node.getAttribute('style') ?? '')
  expect(cards).toHaveLength(3)
  expect(cards[0]).toContain('castles/aden.jpg')
  expect(cards[1]).toContain('castles/goddard.jpg')
  expect(cards[2]).toContain('castles/rune.jpg')
})

it('mostra guias e crônica autênticos quando wiki e notícias estão vazios', async () => {
  mount()

  expect(await screen.findByRole('heading', { name: /Guias, crônica e o que move Aden/i })).toBeVisible()
  expect(screen.getByText('Arquivos do reino')).toBeVisible()

  expect(screen.getByRole('link', { name: /Rates e progressão/i })).toHaveAttribute('href', '/informacoes#rates')
  expect(screen.getByRole('link', { name: /Encantamento/i })).toHaveAttribute('href', '/informacoes#enchant')
  expect(screen.getByRole('link', { name: /Siege e castelos/i })).toHaveAttribute('href', '/informacoes#pvp')
  expect(screen.getByRole('link', { name: /Primeiros passos/i })).toHaveAttribute('href', '/informacoes#comecar')
  expect(screen.getByRole('link', { name: /Perguntas frequentes/i })).toHaveAttribute('href', '/faq')

  expect(screen.getByRole('link', { name: /Notícias do reino/i })).toHaveAttribute('href', '/news')
  expect(screen.getByRole('link', { name: /Roadmap e próximos passos/i })).toHaveAttribute('href', '/roadmap')

  expect(screen.queryByText('Guias do jogo')).not.toBeInTheDocument()
  expect(screen.queryByText('Classes e raças')).not.toBeInTheDocument()
  expect(screen.queryByText(/Wiki e Atualizações do Lineage/i)).not.toBeInTheDocument()
})

it('prioriza páginas e notícias publicadas na seção de crônica', async () => {
  vi.mocked(contentApi.wiki).mockResolvedValue([
    { id: '1', slug: 'siege', title: 'Guia de Siege', summary: 'Conquiste castelos', category: 'PvP' },
  ] as never)
  vi.mocked(contentApi.news).mockResolvedValue([
    { id: '9', slug: 'patch-80', title: 'Patch do castelo', excerpt: 'Siege', published_at: '2026-09-02T12:00:00Z' },
  ] as never)

  mount()

  expect(await screen.findByRole('link', { name: /Guia de Siege/i })).toHaveAttribute('href', '/wiki/siege')
  expect(screen.getByRole('link', { name: /Patch do castelo/i })).toHaveAttribute('href', '/news/patch-80')
  expect(screen.queryByRole('link', { name: /Rates e progressão/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Notícias do reino/i })).not.toBeInTheDocument()
})
