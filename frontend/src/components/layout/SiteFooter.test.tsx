// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { SiteFooter } from './SiteFooter'

vi.mock('../../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn(async () => []) },
}))

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

function mount(resources: Array<{ code: string; enabled: boolean }> = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['resources'], resources)
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
