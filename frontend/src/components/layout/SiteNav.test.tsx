// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { SiteNav } from './SiteNav'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn(async () => []) },
}))

afterEach(cleanup)

function mount(path = '/rankings', resources: Array<{ code: string; enabled: boolean }> = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['resources'], resources)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <SiteNav />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('destaca a rota atual e controla o menu por botão, fundo e Escape', async () => {
  const user = userEvent.setup()
  const { container } = mount()

  expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Rankings' })).toHaveAttribute('aria-current', 'page')
  expect(container.querySelector('.site-nav-brand .site-brand-mark')).toHaveAttribute('src', '/theme/default/images/pdl-symbol.svg')

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
  ])
  expect(screen.queryByRole('link', { name: 'Rankings' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Wiki' })).toBeVisible()
})
