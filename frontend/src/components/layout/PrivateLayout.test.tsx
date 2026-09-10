// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
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

const resourcesMock = vi.hoisted(() => ({
  data: [] as Array<{ code: string; enabled: boolean }>,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'resources') return { data: resourcesMock.data, isPending: false, error: null }
    if (queryKey[0] === 'support-tickets') return { data: { summary: { waiting_user: 0 } } }
    if (queryKey[0] === 'denkynho-pet') return {
      data: {
        level: 1, experience: 0, experience_next: 100,
        attributes: { satiety: 75, energy: 75, happiness: 75, hygiene: 75 },
        emotion: { id: 'calm', pose: '01-boas-vindas', idle_pose: '01-boas-vindas', source: 'default' },
        cue: null,
      },
      isPending: false,
    }
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

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('pt')
  resourcesMock.data = []
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
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/panel" element={<PrivateLayout />}>
            <Route path="*" element={<h1>Conteúdo privado</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  )
}

it('aplica o shell Valorem à área do jogador', () => {
  renderAt('/panel/profile')
  const surface = screen.getByRole('heading', { name: 'Conteúdo privado' }).closest('[data-theme-surface]')
  expect(surface).toHaveAttribute('data-theme-surface', 'panel')
  expect(surface).toHaveAttribute('data-theme-renderer', 'portal-v1')
  expect(screen.getByText("WARRIOR'S SANCTUM")).toBeVisible()
  expect(screen.getByText('VALOREM')).toBeVisible()
})

it('distingue visualmente a administração dentro do mesmo renderer', () => {
  renderAt('/panel/admin')
  const surface = screen.getByRole('heading', { name: 'Conteúdo privado' }).closest('[data-theme-surface]')
  expect(surface).toHaveAttribute('data-theme-surface', 'admin')
  expect(surface).toHaveClass('is-admin-shell')
  expect(screen.getByText('ROYAL COMMAND')).toBeVisible()
  expect(screen.getByText('VALOREM ADMIN')).toBeVisible()
})

it('mostra o mini-mascote fora da Ajuda e o oculta na conversa', () => {
  renderAt('/panel/profile')
  expect(screen.getByRole('button', { name: 'Denkynho: ajuda nesta tela' })).toBeVisible()
  cleanup()
  renderAt('/panel/help')
  expect(screen.queryByRole('button', { name: 'Denkynho: ajuda nesta tela' })).not.toBeInTheDocument()
})

it('preserva o shell original quando o tema default está ativo', () => {
  themeMock.current.presentation = null
  const { container } = renderAt('/panel/admin')
  const surface = screen.getByRole('heading', { name: 'Conteúdo privado' }).closest('[data-theme-surface]')
  expect(surface).not.toHaveClass('portal-panel-shell', 'is-admin-shell')
  expect(screen.getByText('Área do jogador')).toBeVisible()
  expect(screen.getByText('Painel', { selector: '.brand' })).toBeVisible()
  expect(container.querySelector('.panel-brand-mark')).toHaveAttribute('src', '/theme/pdl-symbol.svg')
})

it('esconde itens do menu quando o recurso correspondente está pausado', () => {
  resourcesMock.data = [
    { code: 'accounts', enabled: false },
    { code: 'support', enabled: false },
    { code: 'help', enabled: false },
  ]
  renderAt('/panel/profile')
  expect(screen.queryByRole('link', { name: 'Conta L2' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Atendimento' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Ajuda' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Meu perfil' })).toBeVisible()
})

it('mantém o seletor de idioma fora da grade do perfil no rodapé do menu', () => {
  const { container } = renderAt('/panel/profile')
  const panelUser = container.querySelector('.panel-user')
  const language = container.querySelector('.panel-language')
  const account = container.querySelector('.panel-user-account')
  expect(panelUser).toContainElement(language as HTMLElement)
  expect(panelUser).toContainElement(account as HTMLElement)
  expect(account).not.toContainElement(language as HTMLElement)
  expect(account?.querySelector('.panel-user-avatar')).toBeTruthy()
  expect(account?.querySelector('.panel-user-copy')).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Idioma do site' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Abrir meu perfil' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Sair' })).toBeVisible()
})

it('traduz o rodapé e o cabeçalho do menu quando o idioma muda', async () => {
  themeMock.current.presentation = null
  await i18n.changeLanguage('en')
  renderAt('/panel/profile')
  expect(screen.getByText('Player area')).toBeVisible()
  expect(screen.getByText('Menu')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Open my profile' })).toBeVisible()
  expect(screen.getByText('Verified account')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Sign out' })).toHaveAttribute('title', 'Sign out of the account')
})
