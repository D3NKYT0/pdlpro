// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { serverApi } from '../../services/api'
import { PublicLayout } from './PublicLayout'

vi.mock('../../theme/useDefaultTheme', () => ({ useDefaultTheme: () => undefined }))
vi.mock('../../theme/ThemeProvider', () => ({ useTheme: () => ({ presentation: null }) }))
vi.mock('../../services/domain/server.service', () => ({ serverApi: { info: vi.fn() } }))
vi.mock('./SiteNav', () => ({ SiteNav: () => <nav>Site nav</nav> }))
vi.mock('./SiteFooter', () => ({ SiteFooter: () => <footer>Site footer</footer> }))

function mount(path = '/') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<h1>Home normal</h1>} />
            <Route path="news" element={<h1>Notícias</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(serverApi.info).mockResolvedValue({
    name: 'Imperium',
    description: 'Reino',
    chronicle: 'Interlude',
    rates: {},
    enchant: {},
    max_level: 80,
    features: [],
    notes: {},
    coming_soon: true,
    coming_soon_title: 'Lançamento Imperium',
    coming_soon_subtitle: 'Contagem oficial',
    coming_soon_at: '2027-06-01T18:00:00Z',
  } as never)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('substitui o chrome público pela página de lançamento na home', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2027-05-31T18:00:00Z').getTime())
  mount('/')
  expect(await screen.findByRole('heading', { name: 'Lançamento Imperium' })).toBeVisible()
  expect(screen.getByLabelText('Contagem regressiva do lançamento')).toBeVisible()
  expect(screen.queryByText('Site nav')).not.toBeInTheDocument()
  expect(screen.queryByText('Home normal')).not.toBeInTheDocument()
})

it('mantém o chrome nas demais rotas públicas', async () => {
  mount('/news')
  expect(await screen.findByRole('heading', { name: 'Notícias' })).toBeVisible()
  expect(screen.getByText('Site nav')).toBeVisible()
})
