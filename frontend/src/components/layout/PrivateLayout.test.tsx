// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { PrivateLayout } from './PrivateLayout'

const themeMock = vi.hoisted(() => ({
  current: {
    presentation: {
      renderer: 'portal-v1' as const,
      shells: {
        panel: { kicker: "WARRIOR'S SANCTUM", brand: 'VALOREM' },
        admin: { kicker: 'ROYAL COMMAND', brand: 'VALOREM ADMIN' },
      },
    },
  } as { presentation?: { renderer: 'portal-v1'; shells: { panel: { kicker: string; brand: string }; admin: { kicker: string; brand: string } } } | null },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'resources') return { data: [] }
    if (queryKey[0] === 'support-tickets') return { data: { summary: { waiting_user: 0 } } }
    return { data: { unread: 0 } }
  },
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'root', display_name: 'Root', is_superuser: true, is_email_verified: true },
    logout: vi.fn(),
  }),
}))

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: () => themeMock.current,
  reassertInstalledTheme: vi.fn(),
}))

vi.mock('../../theme/usePanelTheme', () => ({ usePanelTheme: vi.fn() }))
vi.mock('../../theme/assets', () => ({ themeImage: (path: string) => `/theme/${path}` }))

afterEach(() => {
  cleanup()
  themeMock.current.presentation = {
    renderer: 'portal-v1',
    shells: {
      panel: { kicker: "WARRIOR'S SANCTUM", brand: 'VALOREM' },
      admin: { kicker: 'ROYAL COMMAND', brand: 'VALOREM ADMIN' },
    },
  }
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/painel" element={<PrivateLayout />}>
          <Route path="*" element={<h1>Conteúdo privado</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

it('aplica o shell Valorem à área do jogador', () => {
  renderAt('/painel/profile')
  const surface = screen.getByRole('heading', { name: 'Conteúdo privado' }).closest('[data-theme-surface]')
  expect(surface).toHaveAttribute('data-theme-surface', 'panel')
  expect(surface).toHaveAttribute('data-theme-renderer', 'portal-v1')
  expect(screen.getByText("WARRIOR'S SANCTUM")).toBeVisible()
  expect(screen.getByText('VALOREM')).toBeVisible()
})

it('distingue visualmente a administração dentro do mesmo renderer', () => {
  renderAt('/painel/admin')
  const surface = screen.getByRole('heading', { name: 'Conteúdo privado' }).closest('[data-theme-surface]')
  expect(surface).toHaveAttribute('data-theme-surface', 'admin')
  expect(surface).toHaveClass('is-admin-shell')
  expect(screen.getByText('ROYAL COMMAND')).toBeVisible()
  expect(screen.getByText('VALOREM ADMIN')).toBeVisible()
})

it('preserva o shell original quando o tema default está ativo', () => {
  themeMock.current.presentation = null
  renderAt('/painel/admin')
  const surface = screen.getByRole('heading', { name: 'Conteúdo privado' }).closest('[data-theme-surface]')
  expect(surface).not.toHaveClass('portal-panel-shell', 'is-admin-shell')
  expect(screen.getByText('Área do jogador')).toBeVisible()
  expect(screen.getByText('Painel', { selector: '.brand' })).toBeVisible()
})
