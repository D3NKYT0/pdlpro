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
const themeState = vi.hoisted(() => ({ assets: {} as Record<string, string> }))

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
vi.mock('../ThemeProvider', () => ({
  useTheme: () => ({ id: 'default', assets: themeState.assets }),
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
  themeState.assets = {}
  await i18n.changeLanguage('pt')
  vi.mocked(serverApi.rankings).mockResolvedValue([
    { position: 1, name: 'Equinox', value: 1240, extra: { class_id: 0, sex: 0 } },
  ])
  vi.mocked(serverApi.status).mockResolvedValue({ game_online: true, login_online: true, players_online: 88 })
  vi.mocked(serverApi.info).mockResolvedValue({
    name: 'Demo', slogan: '', description: '', chronicle: 'Interlude', rates: { xp: 'x1' },
    enchant: {}, max_level: 80, features: [], notes: {}, coming_soon: false,
    coming_soon_show_info: false,
    coming_soon_title: '', coming_soon_subtitle: '', coming_soon_at: null,
    staff_only_login: false, allow_registration: true, allow_l2_registration: true,
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
  expect(screen.getByRole('heading', { name: 'Reino de prova' })).toBeVisible()
  expect(screen.getByText('INTERLUDE')).toBeVisible()
  expect(document.querySelector('.tpl-spine')).not.toBeNull()
  expect(document.querySelector('.tpl-spine__banner img')).toBeNull()
  expect(screen.getByRole('heading', { name: 'Hall' })).toBeVisible()
  expect(await screen.findByText('Cerco aberto')).toBeVisible()
  expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'HOME' })).toBeVisible()
})

it('o Ashen Ledger põe a data na manchete e os cards na coluna de notícias', () => {
  renderHome('ashenledger')
  expect(document.querySelector('.tpl-ledger')).not.toBeNull()
  expect(document.querySelector('.tpl-ledger__date')).not.toBeNull()
  expect(document.querySelector('.tpl-masthead-date')).toBeNull()
  expect(screen.getByText('INTERLUDE')).toBeVisible()
  expect(document.querySelector('.tpl-ledger__main .tpl-feature')).not.toBeNull()
  expect(document.querySelector('.tpl-ledger__rail .tpl-feature')).toBeNull()
  expect(screen.getByRole('heading', { name: 'Hall' })).toBeVisible()
})

it('o Wayfarer mostra os três primeiros recursos como passos', async () => {
  renderHome('wayfarer')
  expect(document.querySelector('[data-theme-composition="three-steps"]')).toBeTruthy()
  expect(screen.getByText('Passo 1')).toBeVisible()
  expect(screen.getByText('Registrar')).toBeVisible()
  expect(screen.getByText('Personagem')).toBeVisible()
  expect(screen.getByText('Cliente')).toBeVisible()
})

it('o Warhorn esconde o relógio dummy e mantém o relógio de uma data real', () => {
  const { unmount } = renderHome('warhorn')
  expect(document.querySelector('.tpl-warroom')).not.toBeNull()
  expect(screen.getByLabelText('CERCO')).toBeVisible()
  expect(screen.getByRole('link', { name: 'DOWNLOAD' })).toBeVisible()
  unmount()

  render(wrap(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <CatalogHomePage
          presentation={{
            ...presentation,
            renderer: 'warhorn',
            home: {
              ...presentation.home,
              hero: { ...presentation.home.hero, countdownAt: '2099-01-01T00:00:00Z' },
            },
          }}
          templateId="warhorn"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  ))
  expect(document.querySelector('.tpl-countdown')).toBeNull()
  expect(screen.getByRole('link', { name: 'CRIAR CONTA' })).toBeVisible()
})

it('o Ironpatch abre o download ao lado das notas do cliente', () => {
  renderHome('ironpatch')
  expect(document.querySelector('.tpl-launcher__hero')).not.toBeNull()
  expect(screen.getByRole('heading', { name: 'Notas do cliente' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Mural' })).not.toBeInTheDocument()
  expect(screen.queryByText('Três portas')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'CRIAR CONTA' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Hall' })).toBeVisible()
})

it('o Laurelwake mostra o pódio e não repete a tabela', async () => {
  renderHome('laurelwake')
  expect(document.querySelector('.tpl-fame')).not.toBeNull()
  expect(await screen.findByText('Equinox')).toBeVisible()
  expect(document.querySelector('.tpl-podium')).not.toBeNull()
  expect(document.querySelector('.tpl-ranking__table')).toBeNull()
  expect(document.querySelector('.tpl-hall__tag')).toBeNull()
})

it('o Meridian abre o códice sem repetir o subtítulo dos capítulos', () => {
  renderHome('meridian')
  expect(document.querySelector('.tpl-codex__open .pdl-emblem-stage')).not.toBeNull()
  expect(screen.getByRole('heading', { name: 'Reino de prova' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Caminhos' })).toBeVisible()
  expect(screen.queryByText('Três portas')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Hall' })).toBeVisible()
})

it('o Twinwake iguala os dois caminhos dentro do quadro', () => {
  renderHome('twinwake')
  expect(document.querySelector('.tpl-gate')).not.toBeNull()
  expect(document.querySelector('[data-theme-composition="split-gate"]')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'CRIAR CONTA' })).toBeVisible()
  expect(screen.getAllByRole('link', { name: 'DOWNLOAD' }).length).toBeGreaterThan(0)
  expect(document.querySelector('.tpl-split__client')?.textContent).not.toContain('Um servidor clássico.')
})

it('o Cartograph reúne o mapa e as regiões no mesmo quadro', () => {
  renderHome('cartograph')
  expect(document.querySelector('.tpl-atlas')).not.toBeNull()
  expect(screen.getByText('INTERLUDE')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Reino de prova' })).toBeVisible()
  expect(document.querySelectorAll('.tpl-features--regions .tpl-feature')).toHaveLength(3)
})

it('o Classing é uma seleção de retratos, sem o quadro dos outros layouts', () => {
  renderHome('classing')
  expect(document.querySelector('.tpl-select')).not.toBeNull()
  expect(document.querySelector('.tpl-classing__intro')).toBeNull()
  expect(screen.getByText('INTERLUDE')).toBeVisible()
  expect(document.querySelectorAll('.tpl-features--paths .tpl-feature')).toHaveLength(3)
  expect(screen.getByText('Honra')).toBeVisible()
  expect(document.querySelector('.tpl-cta')).toBeNull()
})

it('o Parchment abre sem foto e numera os capítulos depois do título', () => {
  renderHome('parchment')
  expect(document.querySelector('.tpl-manuscript > header')).not.toBeNull()
  expect(screen.getByRole('heading', { name: 'Reino de prova' })).toBeVisible()
  expect(screen.getByText('Capítulo I')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Honra' })).toBeVisible()
  expect(screen.getByText('Capítulo IV')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Cliente' })).toBeVisible()
  expect(document.querySelector('.tpl-cta')).toBeNull()
  expect(screen.getByRole('link', { name: 'CRIAR' })).toBeVisible()
})

it('o Obsidian fica no palco com dois atos e sem o banner repetido', async () => {
  renderHome('obsidian')
  expect(document.querySelector('.tpl-void__stage')).not.toBeNull()
  expect(screen.getByRole('link', { name: 'CRIAR CONTA' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'DOWNLOAD' })).toBeVisible()
  expect(document.querySelector('.tpl-cta')).toBeNull()
  expect(await screen.findByText('Cerco aberto')).toBeVisible()
})

it('o Hearthspire abre pelo mural e guarda as regras para depois', async () => {
  renderHome('hearthspire')
  expect(document.querySelector('.tpl-tavern__board')).not.toBeNull()
  expect(screen.getByText('Mural da taverna')).toBeVisible()
  expect(await screen.findByRole('heading', { name: 'Mural' })).toBeVisible()
  expect(screen.getAllByRole('heading', { name: 'Mural' })).toHaveLength(1)
  expect(screen.getByRole('heading', { name: 'Regras da casa' })).toBeVisible()
  expect(screen.getByText('Honra')).toBeVisible()
  expect(screen.queryByText('Três portas')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Hall' })).toBeVisible()
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
  expect(document.querySelector('.tpl-brand img')).toHaveAttribute('src', '/media/themes/demo/images/logo.png')
  expect(screen.getByText('Tagline')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Termos de Serviço' })).toBeVisible()
  await waitFor(() => expect(document.querySelector('[data-theme-template="ironspine"]')).not.toBeNull())
})
