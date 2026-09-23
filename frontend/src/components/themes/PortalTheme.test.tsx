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
import { PortalHomePage, PortalPublicLayout } from './PortalTheme'

const session = vi.hoisted(() => ({ user: null as { username: string } | null }))
const themeState = vi.hoisted(() => ({
  id: 'valorem',
  assets: {} as Record<string, string>,
}))

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: session.user }) }))
vi.mock('../../services/domain/content.service', () => ({ contentApi: { news: vi.fn() } }))
vi.mock('../../services/domain/server.service', () => ({
  serverApi: { rankings: vi.fn(), info: vi.fn() },
}))
vi.mock('../../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn(async () => []) },
}))
vi.mock('../../extensions', () => ({
  extensionNavItems: () => [],
  isExtensionResourceEnabled: () => true,
}))
vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: () => themeState,
}))
vi.mock('../../theme/assets', () => ({
  themeAsset: (path: string) => `/media/themes/${themeState.id}/${path}`,
  themeImage: (path: string) => `/media/themes/${themeState.id}/images/${path}`,
}))

const presentation: ThemePresentation = {
  renderer: 'portal-v1',
  navigation: [{ label: 'HOME', to: '/' }, { label: 'RANKING', to: '/rankings' }],
  home: {
    hero: {
      title: 'Welcome to Valorem', description: 'A unique experience', countdownLabel: 'SERVER IS OPENING IN',
      countdownAt: '2027-01-03T00:00:00Z', actionLabel: 'CONNECT', actionTo: '/downloads',
    },
    features: {
      title: 'Unique Systems', subtitle: 'Exclusive mechanics', actionLabel: 'SEE ALL FEATURES',
      actionTo: '/info', items: [{ title: 'Balanced Economy', description: 'Fair market', asset: 'feat-1' }],
    },
    ranking: {
      title: 'RATING', subtitle: 'Server Information', actionLabel: 'FULL RATING', actionTo: '/rankings',
      tabs: [{ id: 'pvp', label: 'TOP PVP', kind: 'pvp' }, { id: 'pk', label: 'TOP PK', kind: 'pk' }],
    },
    cta: { title: 'Ready for Battle?', description: 'Join players', actionLabel: 'CREATE ACCOUNT', actionTo: '/register' },
    news: { title: 'NEWS' },
  },
  footer: { tagline: 'The most unique server.', copyright: '© Valorem' },
  shells: {
    auth: { kicker: 'ENTER THE REALM', brand: 'VALOREM' },
    panel: { kicker: "WARRIOR'S SANCTUM", brand: 'VALOREM' },
    admin: { kicker: 'ROYAL COMMAND', brand: 'VALOREM ADMIN' },
  },
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrap(ui: ReactElement) {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-02T00:00:00Z').getTime())
  vi.mocked(serverApi.rankings).mockReset()
  vi.mocked(contentApi.news).mockReset()
  vi.mocked(serverApi.rankings).mockResolvedValue([{ position: 1, name: 'Equinox', value: 1240, extra: { class_id: 0, sex: 0 } }])
  vi.mocked(contentApi.news).mockResolvedValue([])
  themeState.id = 'valorem'
  themeState.assets = {}
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  session.user = null
})

function renderChrome(comingSoon = false) {
  const client = queryClient()
  client.setQueryData(['server-info'], { coming_soon: comingSoon })
  return render(wrap(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Routes>
          <Route element={<PortalPublicLayout presentation={presentation} />}>
            <Route index element={<p>Conteúdo</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  ))
}

it('executa countdown e troca o ranking usando dados reais da API', async () => {
  render(wrap(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter><PortalHomePage presentation={presentation} /></MemoryRouter>
    </QueryClientProvider>,
  ))
  expect(screen.getByText('Welcome to Valorem')).toBeInTheDocument()
  expect(screen.getByLabelText('SERVER IS OPENING IN')).toHaveTextContent('01DIAS')
  expect(await screen.findByText('Equinox')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Retrato de Equinox' })).toHaveAttribute('src', '/theme/avatars/human-m.png')
  expect(serverApi.rankings).toHaveBeenCalledWith('pvp', 5)

  fireEvent.click(screen.getByRole('tab', { name: 'TOP PK' }))
  await waitFor(() => expect(serverApi.rankings).toHaveBeenCalledWith('pk', 5))
})

it('entrega o chrome completo e o comportamento do menu móvel', () => {
  renderChrome()
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
  expect(screen.getByText('Conteúdo').closest('[data-theme-surface="public"]')).not.toBeNull()
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

it('mantém a home do tema na raiz para visitante durante o Coming Soon', () => {
  renderChrome(true)

  expect(screen.getAllByRole('link', { name: 'HOME' })[0]).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: 'Página inicial' })).toHaveAttribute('href', '/')
})

it('no Classic usa o brasão e cenas nos cards, sem countdown', async () => {
  themeState.id = 'default'
  render(wrap(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <Routes>
          <Route element={<PortalPublicLayout presentation={presentation} />}>
            <Route index element={<PortalHomePage presentation={{
              ...presentation,
              home: {
                ...presentation.home,
                hero: {
                  ...presentation.home.hero,
                  secondaryLabel: 'Download',
                  secondaryTo: '/downloads',
                },
                features: {
                  ...presentation.home.features,
                  items: [{ title: 'Crônica', description: 'Arquivo', asset: 'images/home/gemwright-1.webp' }],
                },
              },
            }} />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  ))
  expect(document.querySelector('.portal-shell--classic')).not.toBeNull()
  expect(document.querySelector('.logo img')).toHaveAttribute('src', '/media/themes/default/images/logo.png')
  expect(document.querySelector('.logo img[src*="logo-text"]')).toBeNull()
  expect(screen.getByRole('link', { name: 'Início' })).toHaveClass('portal-footer-mark')
  expect(screen.getByRole('link', { name: 'Início' }).querySelector('img')).toBeTruthy()
  expect(document.querySelector('.pdl-emblem-stage')).not.toBeNull()
  expect(document.querySelector('.countdown')).toBeNull()
  expect(screen.queryByLabelText('SERVER IS OPENING IN')).not.toBeInTheDocument()
  expect(screen.getByText('Acesso ao reino')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'CONNECT' })).toHaveAttribute('href', '/downloads')
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/downloads')
  expect(screen.getByRole('link', { name: 'Explore o reino' })).toHaveAttribute('href', '#features')
  const art = document.querySelector('.feature-card__art') as HTMLElement
  expect(art.style.backgroundImage).toContain('images/home/gemwright-1.webp')
  expect(document.querySelector('.feature-card--scene')).not.toBeNull()
  expect(document.querySelector('.feature-card__icon')).toBeNull()
  expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
})

it('respeita ordem e omissão de seções declaradas no presentation', async () => {
  render(wrap(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <PortalHomePage presentation={{
          ...presentation,
          home: { ...presentation.home, sections: ['cta', 'hero'] },
        }} />
      </MemoryRouter>
    </QueryClientProvider>,
  ))
  expect(screen.getByText('Ready for Battle?')).toBeInTheDocument()
  expect(screen.getByText('Welcome to Valorem')).toBeInTheDocument()
  expect(screen.queryByText('Unique Systems')).not.toBeInTheDocument()
})
