// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { SiteFooter } from './SiteFooter'

const session = vi.hoisted(() => ({ user: null as { username: string } | null }))
const launch = vi.hoisted(() => ({ comingSoon: false }))

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: session.user }) }))
vi.mock('../../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn(async () => []) },
}))
vi.mock('../../services/domain/server.service', () => ({
  serverApi: { info: vi.fn(async () => ({ coming_soon: launch.comingSoon })) },
}))

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  session.user = null
  launch.comingSoon = false
})

function mount(resources: Array<{ code: string; enabled: boolean }> = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['resources'], resources)
  client.setQueryData(['server-info'], { coming_soon: launch.comingSoon })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('apresenta marca, navegação útil e documentos legais sem atalhos decorativos', () => {
  const { container } = mount()

  expect(screen.getByRole('contentinfo')).toBeVisible()
  expect(screen.getByRole('link', { name: 'PDL PRO — Início' })).toHaveAttribute('href', '/')
  expect(container.querySelector('.site-footer-mark')).toHaveAttribute('src', '/theme/default/images/pdl-symbol.svg')

  expect(screen.getByRole('navigation', { name: 'Explorar o site' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Rankings' })).toHaveAttribute('href', '/rankings')
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/downloads')
  expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register')
  expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacy')
  expect(screen.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/cookies')
  expect(screen.getByRole('link', { name: 'LGPD' })).toHaveAttribute('href', '/lgpd')
  expect(screen.getByRole('link', { name: 'Histórico legal' })).toHaveAttribute('href', '/legal/history')

  const columns = [...container.querySelectorAll('.site-footer-col')]
  expect(columns).toHaveLength(3)
  columns.forEach((column) => {
    expect(column.tagName).toBe('DIV')
    expect(column).toHaveAttribute('role', 'navigation')
    expect(column.querySelectorAll(':scope > ul > li > a').length).toBeGreaterThan(0)
  })

  expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} PDL PRO`))).toBeVisible()
  expect(screen.getByText('Português')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Comunidade' })).not.toBeInTheDocument()
  expect(screen.queryByText(/Feito com/i)).not.toBeInTheDocument()
  expect(container.querySelector('.language-dropdown')).toBeNull()
})

it('expõe a comunidade apenas quando a URL do Discord está configurada', () => {
  vi.stubEnv('VITE_DISCORD_URL', 'https://discord.gg/pdl')

  mount()

  const community = screen.getByRole('link', { name: 'Comunidade' })
  expect(community).toHaveAttribute('href', 'https://discord.gg/pdl')
  expect(community).toHaveAttribute('target', '_blank')
  expect(community).toHaveAttribute('rel', 'noreferrer')
})

it('leva marca e Início para /home durante o Coming Soon quando há sessão', () => {
  session.user = { username: 'root' }
  launch.comingSoon = true

  mount()

  expect(screen.getByRole('link', { name: 'PDL PRO — Início' })).toHaveAttribute('href', '/home')
  expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/home')
})

it('mantém Início na raiz para visitante durante o Coming Soon', () => {
  launch.comingSoon = true

  mount()

  expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
})

it('oculta links de conteúdo pausados no rodapé', () => {
  mount([
    { code: 'wiki', enabled: false },
    { code: 'faq', enabled: false },
    { code: 'downloads', enabled: false },
  ])
  expect(screen.queryByRole('link', { name: 'Wiki' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Perguntas frequentes' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Rankings' })).toBeVisible()
})
