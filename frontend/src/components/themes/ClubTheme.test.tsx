// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { contentApi, serverApi } from '../../services/api'
import type { ThemePresentation } from '../../services/api'
import { ClubHomePage, ClubPublicLayout } from './ClubTheme'

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
vi.mock('../../theme/assets', () => ({
  themeAsset: (path: string) => `/media/themes/saga/${path}`,
}))

const presentation: ThemePresentation = {
  renderer: 'club-v1',
  navigation: [{ label: 'HOME', to: '/' }, { label: 'RANKING', to: '/rankings' }],
  home: {
    hero: {
      title: 'Saga Club',
      kicker: 'LINEAGE 2',
      subtitle: 'INTERLUDE 20X',
      description: 'Espírito clássico',
      countdownLabel: 'ABERTURA',
      countdownAt: '2027-01-03T00:00:00Z',
      actionLabel: 'JOGAR AGORA',
      actionTo: '/register',
      secondaryLabel: 'SAIBA MAIS',
      secondaryTo: '/info',
    },
    features: {
      title: 'Por que Saga?',
      subtitle: 'Clássico e vivo',
      actionLabel: 'VER INFORMAÇÕES',
      actionTo: '/info',
      items: [{ title: 'Interlude', description: 'A era dourada', asset: 'images/features/chronicle.png' }],
    },
    ranking: {
      title: 'Top rankings',
      subtitle: 'Os nomes',
      actionLabel: 'RANKING COMPLETO',
      actionTo: '/rankings',
      tabs: [{ id: 'pvp', label: 'PVP', kind: 'pvp' }, { id: 'clans', label: 'CLÃS', kind: 'clans' }],
    },
    cta: { title: 'As lendas se reúnem', description: 'Entre agora', actionLabel: 'CRIAR CONTA', actionTo: '/register' },
    news: { title: 'Últimas notícias' },
    stats: {
      items: [
        { id: 'online', label: 'Online', kind: 'online' },
        { id: 'chronicle', label: 'Crônica', kind: 'chronicle' },
        { id: 'rates', label: 'Rates', kind: 'rates' },
      ],
    },
    pillars: {
      title: 'Pilares',
      items: [{ title: 'PvP real', description: 'Sem pay to win' }],
    },
  },
  footer: { tagline: 'O mesmo espírito.', copyright: 'Saga Club' },
  shells: {
    auth: { kicker: 'ENTRE NA SAGA', brand: 'SAGA CLUB' },
    panel: { kicker: 'SANTUÁRIO', brand: 'SAGA CLUB' },
    admin: { kicker: 'COMANDO', brand: 'SAGA ADMIN' },
  },
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrap(ui: ReactElement) {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
}

beforeEach(async () => {
  await i18n.changeLanguage('pt')
  vi.mocked(serverApi.rankings).mockReset()
  vi.mocked(serverApi.status).mockReset()
  vi.mocked(serverApi.info).mockReset()
  vi.mocked(contentApi.news).mockReset()
  vi.mocked(serverApi.rankings).mockResolvedValue([{ position: 1, name: 'Equinox', value: 1240, extra: { class_id: 0, sex: 0 } }])
  vi.mocked(serverApi.status).mockResolvedValue({ game_online: true, login_online: true, players_online: 1248 })
  vi.mocked(serverApi.info).mockResolvedValue({
    name: 'Saga Club', slogan: '', description: '', chronicle: 'Interlude', rates: { xp: 'x20' },
    enchant: {}, max_level: 80, features: [], notes: {}, coming_soon: false,
    coming_soon_title: '', coming_soon_subtitle: '', coming_soon_at: null,
  })
  vi.mocked(contentApi.news).mockResolvedValue([
    { id: 'n1', title: 'Cerco aberto', slug: 'cerco', excerpt: 'Prepare o clã', body: '', published_at: '2026-09-01T12:00:00Z' },
  ])
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  session.user = null
})

function renderHome(value: ThemePresentation = presentation) {
  return render(wrap(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter><ClubHomePage presentation={value} /></MemoryRouter>
    </QueryClientProvider>,
  ))
}

function renderChrome(comingSoon = false) {
  const client = queryClient()
  client.setQueryData(['server-info'], { coming_soon: comingSoon })
  return render(wrap(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Routes>
          <Route element={<ClubPublicLayout presentation={presentation} />}>
            <Route index element={<p>Conteúdo</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  ))
}

it('compõe o hero dos mockups com wordmark e dois CTAs', () => {
  renderHome()
  expect(screen.getByRole('heading', { name: 'Saga Club' })).toBeVisible()
  expect(screen.getByRole('img', { name: 'Saga Club' })).toHaveAttribute('src', '/media/themes/saga/images/logo-text.png')
  expect(screen.getByText('LINEAGE 2')).toBeVisible()
  expect(screen.getByText('INTERLUDE 20X')).toBeVisible()
  expect(screen.getByRole('link', { name: 'JOGAR AGORA' })).toHaveAttribute('href', '/register')
  expect(screen.getByRole('link', { name: 'SAIBA MAIS' })).toHaveAttribute('href', '/info')
  expect(screen.queryByLabelText('ABERTURA')).not.toBeInTheDocument()
})

it('pinta os cards com a arte declarada e lê stats reais', async () => {
  renderHome()
  const art = document.querySelector('.club-feature__art') as HTMLElement
  expect(art.style.getPropertyValue('--club-feature-art')).toContain('images/features/chronicle.png')
  expect(await screen.findByText('1.248')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Interlude' })).toBeVisible()
  expect(screen.getByText('x20')).toBeVisible()
  expect(screen.getByText('PvP real')).toBeVisible()
})

it('doca notícias, CTA e ranking com dados da API', async () => {
  renderHome()
  expect(await screen.findByText('Cerco aberto')).toBeVisible()
  expect(screen.getByRole('link', { name: /Cerco aberto/ })).toHaveAttribute('href', '/news/cerco')
  expect(screen.getByText('As lendas se reúnem')).toBeVisible()
  expect(await screen.findByText('Equinox')).toBeVisible()
  fireEvent.click(screen.getByRole('tab', { name: 'CLÃS' }))
  await waitFor(() => expect(serverApi.rankings).toHaveBeenCalledWith('clans', 5))
})

it('mostra vazio, erro e carregamento nas colunas do dock', async () => {
  vi.mocked(contentApi.news).mockResolvedValue([])
  vi.mocked(serverApi.rankings).mockRejectedValue(new Error('down'))
  renderHome()
  expect(await screen.findByText('Nenhuma notícia ainda.')).toBeVisible()
  expect(await screen.findByRole('alert')).toHaveTextContent('down')
})

it('entrega o chrome do clube e o menu móvel', () => {
  renderChrome()
  expect(screen.getByRole('link', { name: 'JOGAR AGORA' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
  expect(screen.getByRole('navigation', { name: 'Navegação móvel' })).toBeVisible()
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
  expect(screen.queryByRole('navigation', { name: 'Navegação móvel' })).toBeNull()
})

it('aponta a home do tema para /home durante o Coming Soon quando há sessão', () => {
  session.user = { username: 'root' }
  renderChrome(true)
  expect(screen.getAllByRole('link', { name: 'HOME' })[0]).toHaveAttribute('href', '/home')
  expect(screen.getByRole('link', { name: 'Página inicial' })).toHaveAttribute('href', '/home')
})
