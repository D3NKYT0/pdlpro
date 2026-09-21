// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { contentApi, serverApi, type ThemePresentation } from '../../services/api'
import { THEME_CATALOG_IDS, type ThemeCatalogId } from './ids'
import { PUBLIC_TEMPLATES } from './catalog'
import { CatalogHomePage } from './CatalogHome'
import { TemplateShell } from './TemplateShell'

const session = vi.hoisted(() => ({ user: null as { username: string } | null }))

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: session.user }) }))
vi.mock('../../services/domain/content.service', () => ({ contentApi: { news: vi.fn() } }))
vi.mock('../../services/domain/server.service', () => ({
  serverApi: { rankings: vi.fn(), info: vi.fn(), status: vi.fn() },
}))
vi.mock('../../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn(async () => []) },
}))
vi.mock('../../extensions', () => ({
  extensionNavItems: () => [],
  isExtensionResourceEnabled: () => true,
}))
vi.mock('../assets', () => ({
  themeAsset: (path: string) => `/media/themes/demo/${path}`,
  themeImage: (path: string) => `/media/themes/demo/images/${path}`,
}))

const presentation: ThemePresentation = {
  renderer: 'ironspine',
  navigation: [{ label: 'HOME', to: '/' }, { label: 'RANKING', to: '/rankings' }],
  home: {
    hero: {
      title: 'Reino de prova',
      kicker: 'INTERLUDE',
      subtitle: 'Baixe o cliente',
      description: 'Um servidor clássico.',
      countdownLabel: 'CERCO',
      countdownAt: '2027-01-03T00:00:00Z',
      actionLabel: 'CRIAR CONTA',
      actionTo: '/register',
      secondaryLabel: 'DOWNLOAD',
      secondaryTo: '/downloads',
    },
    features: {
      title: 'Caminhos',
      subtitle: 'Três portas',
      actionLabel: 'INFO',
      actionTo: '/info',
      items: [
        { title: 'Registrar', description: 'Conta mestra', asset: 'images/features/a.png' },
        { title: 'Personagem', description: 'No painel', asset: 'images/features/b.png' },
        { title: 'Cliente', description: 'Instalar', asset: 'images/features/c.png' },
      ],
    },
    ranking: {
      title: 'Hall',
      subtitle: 'PvP',
      actionLabel: 'VER',
      actionTo: '/rankings',
      tabs: [{ id: 'pvp', label: 'PVP', kind: 'pvp' }],
    },
    cta: { title: 'Entre', description: 'Agora', actionLabel: 'CRIAR', actionTo: '/register' },
    news: { title: 'Mural' },
    stats: {
      items: [
        { id: 'online', label: 'Online', kind: 'online' },
        { id: 'chronicle', label: 'Crônica', kind: 'chronicle' },
      ],
    },
    pillars: {
      title: 'Leis',
      items: [{ title: 'Honra', description: 'Sem P2W' }],
    },
  },
  footer: { tagline: 'Tagline', copyright: 'Demo' },
}

function wrap(ui: ReactElement) {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderHome(templateId: ThemeCatalogId) {
  return render(wrap(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <CatalogHomePage presentation={{ ...presentation, renderer: templateId }} templateId={templateId} />
      </MemoryRouter>
    </QueryClientProvider>,
  ))
}

beforeEach(async () => {
  await i18n.changeLanguage('pt')
  vi.mocked(serverApi.rankings).mockResolvedValue([
    { position: 1, name: 'Equinox', value: 1240, extra: { class_id: 0, sex: 0 } },
  ])
  vi.mocked(serverApi.status).mockResolvedValue({ game_online: true, login_online: true, players_online: 88 })
  vi.mocked(serverApi.info).mockResolvedValue({
    name: 'Demo', slogan: '', description: '', chronicle: 'Interlude', rates: { xp: 'x1' },
    enchant: {}, max_level: 80, features: [], notes: {}, coming_soon: false,
    coming_soon_title: '', coming_soon_subtitle: '', coming_soon_at: null,
  } as never)
  vi.mocked(contentApi.news).mockResolvedValue([
    { id: 'n1', title: 'Cerco aberto', slug: 'cerco', excerpt: 'Prepare o clã', body: '', published_at: '2026-09-01T12:00:00Z' },
  ])
})

afterEach(() => {
  cleanup()
  session.user = null
})

it('cada template do catálogo (exceto os legado) marca composição distinta', async () => {
  const ids = THEME_CATALOG_IDS.filter((id) => id !== 'vesperlyn' && id !== 'gemwright')
  const seen = new Set<string>()
  for (const id of ids) {
    const { container, unmount } = renderHome(id)
    const root = container.querySelector(`[data-theme-template="${id}"]`)
    expect(root).not.toBeNull()
    expect(root).toHaveAttribute('data-theme-composition', PUBLIC_TEMPLATES[id].composition)
    seen.add(root!.getAttribute('data-theme-composition') ?? '')
    unmount()
  }
  expect(seen.size).toBe(ids.length)
})

it('o Ironspine monta o poço de notícias e o menu esquerdo do site clássico', async () => {
  renderHome('ironspine')
  expect(document.querySelector('[data-theme-composition="three-column-spine"]')).toBeTruthy()
  expect(await screen.findByText('Cerco aberto')).toBeVisible()
  expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'HOME' })).toBeVisible()
})

it('o Wayfarer mostra os três primeiros recursos como passos', async () => {
  renderHome('wayfarer')
  expect(document.querySelector('[data-theme-composition="three-steps"]')).toBeTruthy()
  expect(screen.getByText('Passo 1')).toBeVisible()
  expect(screen.getByText('Registrar')).toBeVisible()
  expect(screen.getByText('Personagem')).toBeVisible()
  expect(screen.getByText('Cliente')).toBeVisible()
})

it('o Twinwake abre dois caminhos iguais na dobra', () => {
  renderHome('twinwake')
  expect(document.querySelector('[data-theme-composition="split-gate"]')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'CRIAR CONTA' })).toBeVisible()
  expect(screen.getAllByRole('link', { name: 'DOWNLOAD' }).length).toBeGreaterThan(0)
})

it('o casco do catálogo lê a navegação do presentation e o rodapé legal', async () => {
  const client = queryClient()
  client.setQueryData(['server-info'], { coming_soon: false })
  client.setQueryData(['resources'], [])
  render(wrap(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Routes>
          <Route element={<TemplateShell presentation={presentation} templateId="ironspine" />}>
            <Route index element={<p>Conteúdo interno</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  ))
  expect(screen.getByText('Conteúdo interno')).toBeVisible()
  expect(screen.getByText('Tagline')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Termos de Serviço' })).toBeVisible()
  await waitFor(() => expect(document.querySelector('[data-theme-template="ironspine"]')).not.toBeNull())
})
