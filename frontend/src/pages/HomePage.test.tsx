// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { contentApi, serverApi } from '../services/api'
import { HomePage } from './HomePage'

vi.mock('../theme/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({ presentation: null, name: undefined, description: undefined })),
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

  expect(rates).toHaveAttribute('href', '/info#rates')
  expect(siege).toHaveAttribute('href', '/info#pvp')
  expect(fame).toHaveAttribute('href', '/rankings')

  expect(screen.getByText('Progressão, economia e o ritmo do reino')).toBeVisible()
  expect(screen.getByText('Siege, clãs e o domínio de Aden')).toBeVisible()
  expect(screen.getByText('PvP, olimpíada e os melhores clãs')).toBeVisible()

  expect(screen.queryByText('Missões Personalizadas')).not.toBeInTheDocument()
  expect(screen.queryByText('Eventos e Recompensas')).not.toBeInTheDocument()
  expect(screen.queryByText(/servidor mais atualizado, moderno e estável/i)).not.toBeInTheDocument()
})

it('usa artes próprias do PDL nos destaques e mantém o guardião central', async () => {
  mount()
  await screen.findByRole('link', { name: /Crônica e Rates/i })

  const cards = [...document.querySelectorAll('.home-features .f-list a > div')].map((node) => node.getAttribute('style') ?? '')
  expect(cards).toHaveLength(3)
  expect(cards[0]).toContain('home/chronicle-rates-v2.webp')
  expect(cards[1]).toContain('home/castle-siege-v2.webp')
  expect(cards[2]).toContain('home/hall-of-fame-v2.webp')
  expect(document.querySelector('.home-features .character img')).toHaveAttribute(
    'src',
    expect.stringContaining('home/aden-guardian-v2.webp'),
  )
})

it('aplica cenários próprios às demais alas da página inicial', async () => {
  mount()
  await screen.findByRole('heading', { name: /Guias, crônica e o que move Aden/i })

  expect(document.querySelector('.home-wiki')?.getAttribute('style')).toContain('home/archive-v2.webp')
  expect(document.querySelector('.home-clans')?.getAttribute('style')).toContain('home/clans-v2.webp')
  expect(document.querySelector('.home-rankings')?.getAttribute('style')).toContain('home/rankings-v2.webp')
  expect(document.querySelector('.trailer-section')?.getAttribute('style')).toContain('home/cinematic-v2.webp')
})

it('carrega o iframe do trailer só após o clique no facade', async () => {
  const user = userEvent.setup()
  mount()
  await screen.findByRole('heading', { name: /Trailer Oficial/i })

  expect(document.querySelector('.trailer-frame-inner iframe')).toBeNull()
  const play = screen.getByRole('button', { name: /Reproduzir trailer oficial/i })
  expect(play).toBeVisible()

  await user.click(play)

  const iframe = document.querySelector('.trailer-frame-inner iframe')
  expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube-nocookie.com/embed/Mm19W1PKMFQ'))
  expect(iframe).toHaveAttribute('title', 'Trailer oficial')
  expect(screen.queryByRole('button', { name: /Reproduzir trailer oficial/i })).not.toBeInTheDocument()
})

it('mantém o atalho de scroll do hero apontando para os pilares', async () => {
  mount()
  await screen.findByRole('link', { name: /Baixe o Jogo/i })

  const scrollCue = document.querySelector('.h-scroll a')
  expect(scrollCue).toHaveAttribute('href', '#features')
  expect(document.querySelector('#features')).toBeTruthy()
})

it('expõe pilares e arquivos como listas empilháveis no mobile', async () => {
  mount()
  await screen.findByRole('link', { name: /Crônica e Rates/i })

  expect(document.querySelector('.home-features .f-list')).toBeTruthy()
  expect(document.querySelectorAll('.home-features .f-list > a')).toHaveLength(3)
  expect(document.querySelector('.home-wiki .w-list')).toBeTruthy()
  expect(document.querySelector('.home-wiki .w-list .wiki')).toBeTruthy()
  expect(document.querySelectorAll('.home-wiki .w-list a.update')).toHaveLength(2)
})

it('mostra guias e crônica autênticos quando wiki e notícias estão vazios', async () => {
  mount()

  expect(await screen.findByRole('heading', { name: /Guias, crônica e o que move Aden/i })).toBeVisible()
  expect(screen.getByText('Arquivos do reino')).toBeVisible()

  expect(screen.getByRole('link', { name: /Rates e progressão/i })).toHaveAttribute('href', '/info#rates')
  expect(screen.getByRole('link', { name: /Encantamento/i })).toHaveAttribute('href', '/info#enchant')
  expect(screen.getByRole('link', { name: /Siege e castelos/i })).toHaveAttribute('href', '/info#pvp')
  expect(screen.getByRole('link', { name: /Primeiros passos/i })).toHaveAttribute('href', '/info#comecar')
  expect(screen.getByRole('link', { name: /Perguntas frequentes/i })).toHaveAttribute('href', '/faq')

  expect(screen.getByRole('link', { name: /Notícias do reino/i })).toHaveAttribute('href', '/news')
  expect(screen.getByRole('link', { name: /Roadmap e próximos passos/i })).toHaveAttribute('href', '/roadmap')
  expect(screen.getByText('Crônica')).toBeVisible()
  expect(screen.getByText('Temporada')).toBeVisible()

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

it('marca a home default com data-theme-part e usa nome/descrição de pacote customizado', async () => {
  const { useTheme } = await import('../theme/ThemeProvider')
  vi.mocked(useTheme).mockReturnValue({
    presentation: null,
    builtin: false,
    name: 'Reino Temático',
    description: 'Descrição do pacote de tema',
  } as never)

  mount()
  await screen.findByRole('link', { name: /Baixe o Jogo/i })

  expect(document.querySelector('[data-theme-part="home"]')).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1, name: 'Reino Temático' })).toBeVisible()
  expect(screen.getByText(/Descrição do pacote de tema/)).toBeVisible()
})

it('no tema builtin usa o copy de marketing traduzível, não o nome do pacote', async () => {
  const { useTheme } = await import('../theme/ThemeProvider')
  vi.mocked(useTheme).mockReturnValue({
    presentation: null,
    builtin: true,
    name: 'PDL Classic',
    description: 'Visual clássico do PDL PRO — Aden, tipografia e a identidade original.',
  } as never)

  mount()
  await screen.findByRole('link', { name: /Baixe o Jogo/i })

  expect(screen.getByRole('heading', { level: 1, name: 'Inicie sua Jornada em Lineage Agora!' })).toBeVisible()
  expect(screen.getByText(/Onde Lendas Nascem/)).toBeVisible()
  expect(screen.queryByText('PDL Classic')).not.toBeInTheDocument()
})
