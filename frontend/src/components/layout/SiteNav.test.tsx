// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { SiteNav } from './SiteNav'

const session = vi.hoisted(() => ({ user: null as { username: string } | null }))
const launch = vi.hoisted(() => ({ comingSoon: false }))
const extensionNavMock = vi.hoisted(() => ({
  public: [] as Array<{ to: string; labelKey: string; ns: string; resource?: string }>,
}))

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: session.user }) }))
vi.mock('../../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn(async () => []) },
}))
vi.mock('../../services/domain/server.service', () => ({
  serverApi: { info: vi.fn(async () => ({ coming_soon: launch.comingSoon })) },
}))
vi.mock('../../extensions', () => ({
  extensionNavItems: (scope: string) => (scope === 'public' ? extensionNavMock.public : []),
  isExtensionResourceEnabled: (
    resources: Array<{ code: string; enabled: boolean }> | undefined,
    code: string | undefined,
  ) => !code || !resources?.some((row) => row.code === code && !row.enabled),
}))

afterEach(() => {
  cleanup()
  session.user = null
  launch.comingSoon = false
  extensionNavMock.public = []
})

function CurrentPath() {
  return <p data-testid="current-path">{useLocation().pathname}</p>
}

function mount(path = '/rankings', resources: Array<{ code: string; enabled: boolean }> = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['resources'], resources)
  client.setQueryData(['server-info'], { coming_soon: launch.comingSoon })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <SiteNav />
          <CurrentPath />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

it('destaca a rota atual e controla o menu por botão, fundo e Escape', async () => {
  const user = userEvent.setup()
  const { container } = mount()

  expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Rankings' })).toHaveAttribute('aria-current', 'page')
  expect(container.querySelector('.site-nav-brand .site-brand-mark')).toHaveAttribute('src', '/theme/default/images/pdl-symbol.svg')
  expect(container.querySelectorAll('.site-nav-actions .language-switcher [data-theme-part="select"]')).toHaveLength(1)
  expect(container.querySelectorAll('.language-switcher .ui-select-trigger')).toHaveLength(1)

  const toggle = screen.getByRole('button', { name: 'Abrir menu' })
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(container.querySelector('.site-nav-drawer')).toHaveClass('is-open')

  await user.click(container.querySelector('.site-nav-backdrop') as HTMLButtonElement)
  expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await user.click(toggle)

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(container.querySelector('.site-nav-drawer')).not.toHaveClass('is-open')
})

it('oculta links de conteúdo quando o recurso está pausado', () => {
  mount('/', [
    { code: 'rankings', enabled: false },
    { code: 'downloads', enabled: false },
    { code: 'game-stores', enabled: false },
  ])
  expect(screen.queryByRole('link', { name: 'Rankings' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Lojas' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Wiki' })).toBeVisible()
})

it('mostra o atalho das lojas do jogo', () => {
  mount('/')
  expect(screen.getByRole('link', { name: 'Lojas' })).toHaveAttribute('href', '/stores')
})

it.each(['/', '/home'])('marca Início como página atual em %s', (path) => {
  const { container } = mount(path)
  const home = screen.getByRole('link', { name: 'Início' })
  expect(home).toHaveAttribute('aria-current', 'page')
  expect(home.closest('li')).toHaveClass('active')
  expect(container.querySelector('.site-nav-drawer li.active a')).toBe(home)
})

it('aponta Início e marca para /home quando o Coming Soon está ligado e há sessão', () => {
  session.user = { username: 'root' }
  launch.comingSoon = true
  mount('/news')

  const home = screen.getByRole('link', { name: 'Início' })
  expect(home).toHaveAttribute('href', '/home')
  expect(screen.getByRole('link', { name: 'PDL PRO — Início' })).toHaveAttribute('href', '/home')
})

it('mantém Início na raiz para visitante durante o Coming Soon', () => {
  launch.comingSoon = true
  mount('/news')

  expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: 'PDL PRO — Início' })).toHaveAttribute('href', '/')
})

it('mantém Início na raiz com o site aberto mesmo autenticado', () => {
  session.user = { username: 'root' }
  mount('/news')

  expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
})

it('clicar em Início durante o Coming Soon mantém o visitante autenticado na landing', async () => {
  const user = userEvent.setup()
  session.user = { username: 'root' }
  launch.comingSoon = true
  mount('/news')

  await user.click(screen.getByRole('link', { name: 'Início' }))
  expect(screen.getByTestId('current-path').textContent).toBe('/home')
})

it('clicar em Início com o site aberto leva para a raiz', async () => {
  const user = userEvent.setup()
  session.user = { username: 'root' }
  mount('/news')

  await user.click(screen.getByRole('link', { name: 'Início' }))
  expect(screen.getByTestId('current-path').textContent).toBe('/')
})

it('anexa links públicos da extensão ao menu', () => {
  extensionNavMock.public = [{ to: '/ext/example/ping', labelKey: 'nav.ping', ns: 'ext.example' }]
  mount('/')
  expect(screen.getByRole('link', { name: 'Ping da extensão' })).toHaveAttribute('href', '/ext/example/ping')
})

it('oculta o link da extensão quando o recurso está pausado', () => {
  extensionNavMock.public = [
    { to: '/ext/example/ping', labelKey: 'nav.ping', ns: 'ext.example', resource: 'ext.example.ping' },
  ]
  mount('/', [{ code: 'ext.example.ping', enabled: false }])
  expect(screen.queryByRole('link', { name: 'Ping da extensão' })).not.toBeInTheDocument()
})
