// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { contentApi, serverApi } from '../../services/api'
import type { ThemePresentation } from '../../services/domain/theme.service'
import { PortalHomePage, PortalPublicLayout } from './PortalTheme'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../services/domain/content.service', () => ({ contentApi: { news: vi.fn() } }))
vi.mock('../../services/domain/server.service', () => ({ serverApi: { rankings: vi.fn() } }))

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
      actionTo: '/informacoes', items: [{ title: 'Balanced Economy', description: 'Fair market', asset: 'feat-1' }],
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

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-02T00:00:00Z').getTime())
  vi.mocked(serverApi.rankings).mockResolvedValue([{ position: 1, name: 'Equinox', value: 1240 }])
  vi.mocked(contentApi.news).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('executa countdown e troca o ranking usando dados reais da API', async () => {
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter><PortalHomePage presentation={presentation} /></MemoryRouter>
    </QueryClientProvider>,
  )
  expect(screen.getByText('Welcome to Valorem')).toBeInTheDocument()
  expect(screen.getByLabelText('SERVER IS OPENING IN')).toHaveTextContent('01DAYS')
  expect(await screen.findByText('Equinox')).toBeInTheDocument()
  expect(serverApi.rankings).toHaveBeenCalledWith('pvp', 5)

  fireEvent.click(screen.getByRole('tab', { name: 'TOP PK' }))
  await waitFor(() => expect(serverApi.rankings).toHaveBeenCalledWith('pk', 5))
})

it('entrega o chrome completo e o comportamento do menu móvel', () => {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<PortalPublicLayout presentation={presentation} />}>
          <Route index element={<p>Conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
  expect(screen.getByText('Conteúdo').closest('[data-theme-surface="public"]')).not.toBeNull()
  expect(screen.getByRole('navigation', { name: 'Navegação móvel' })).toBeVisible()
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
  expect(screen.queryByRole('navigation', { name: 'Navegação móvel' })).toBeNull()
})
