// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '../../i18n'
import { THEME_CATALOG_IDS, type ThemeRendererId } from './ids'
import { configureRuntimeTheme } from '../assets'
const RENDERERS = [...THEME_CATALOG_IDS, 'portal-v1', 'club-v1'] as const
import type { ThemePresentation } from '../../services/api'
import { PublicLayout } from '../../components/layout/PublicLayout'
import { HomePage } from '../../pages/HomePage'

const state = vi.hoisted(() => ({ id: 'demo', assets: {} as Record<string, string>, presentation: null as ThemePresentation | null }))
vi.mock('../ThemeProvider', () => ({ useTheme: () => ({ ...state }) }))
vi.mock('../useDefaultTheme', () => ({ useDefaultTheme: () => undefined }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../services/domain/programs.service', () => ({ programsApi: { resources: vi.fn(async () => []), publicSupporters: vi.fn(async () => []) } }))
vi.mock('../../services/domain/content.service', () => ({ contentApi: { news: vi.fn(async () => []), banners: vi.fn(async () => []) } }))
vi.mock('../../services/domain/server.service', () => ({ serverApi: {
  info: vi.fn(async () => ({ coming_soon: false, chronicle: 'High Five', rates: { xp: 'x50' } })),
  status: vi.fn(async () => ({ game_online: true, players_online: 42 })), rankings: vi.fn(async () => []),
} }))
const clients: QueryClient[] = []
beforeEach(() => { state.id = 'demo'; state.assets = { 'images/video.mp4': '/media/demo/movie.mp4' } })
afterEach(() => { cleanup(); clients.forEach(c => c.clear()); clients.length = 0; document.body.style.overflow = ''; configureRuntimeTheme({}) })

function mount(id: ThemeRendererId, hero = true, defaults = false) {
  state.presentation = {
    renderer: id, navigation: [{ to: '/', label: 'Home' }, { to: '/info', label: 'Information' }, { to: '/downloads', label: 'Download' }, { to: '/register', label: 'Register' }],
    home: {
      hero: { title: 'Realm', description: 'Description', actionLabel: 'Start', actionTo: '/register', secondaryLabel: 'About', secondaryTo: '/info', countdownLabel: 'Launch', countdownAt: '2099-01-01T00:00:00Z' },
      features: { title: 'Features', subtitle: 'Details', actionLabel: 'More', actionTo: '/info', items: [] },
      ranking: { title: 'Ranking', subtitle: 'Players', actionLabel: 'Ranking', actionTo: '/rankings', tabs: [{ id: 'pvp', label: 'PvP', kind: 'pvp' }] },
      cta: { title: 'Join', description: 'Join us', actionLabel: 'Join', actionTo: '/register' }, news: { title: 'News' }, sections: hero ? ['hero', 'news', 'ranking'] : ['news', 'ranking'],
    }, footer: { tagline: 'Tagline', copyright: 'Realm' },
  }
  if (defaults) delete state.presentation.home.sections
  configureRuntimeTheme(state.assets)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client)
  return render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<PublicLayout />}><Route index element={<HomePage />} /><Route path="info" element={<h1>Information destination</h1>} /><Route path="register" element={<h1>Registration destination</h1>} /></Route></Routes></MemoryRouter></QueryClientProvider>)
}

it.each(RENDERERS)('%s plays exactly one packaged hero video without replacing its layout', async id => {
  const { container } = mount(id)
  await screen.findByRole('button', { name: 'Abrir menu' })
  const videos = container.querySelectorAll('video'); expect(videos).toHaveLength(1)
  expect(videos[0]).toHaveAttribute('autoplay'); expect(videos[0]).toHaveProperty('muted', true)
  expect(videos[0]).toHaveAttribute('loop'); expect(videos[0]).toHaveAttribute('playsinline')
  expect(container.querySelector(`[data-theme-renderer="${id}"]`)).not.toBeNull()
})

it.each(RENDERERS)('%s keeps mobile destinations unique and closes with Escape and navigation', async id => {
  mount(id); const user = userEvent.setup()
  const open = await screen.findByRole('button', { name: 'Abrir menu' }); await user.click(open)
  let nav = screen.getByRole('navigation', { name: 'Navegação móvel' })
  const destinations = within(nav).getAllByRole('link').map(a => a.getAttribute('href'))
  expect(new Set(destinations).size).toBe(destinations.length)
  expect(document.body.style.overflow).toBe('hidden')
  await user.keyboard('{Escape}'); expect(screen.queryByRole('navigation', { name: 'Navegação móvel' })).toBeNull()
  expect(open).toHaveFocus(); expect(document.body.style.overflow).not.toBe('hidden')
  await user.click(open); nav = screen.getByRole('navigation', { name: 'Navegação móvel' })
  await user.click(within(nav).getByRole('link', { name: 'Information' }))
  expect(await screen.findByRole('heading', { name: 'Information destination' })).toBeVisible()
  await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Navegação móvel' })).toBeNull())
})

it.each(RENDERERS)('%s does not load hero media when the hero is disabled', async id => {
  const { container } = mount(id, false); await screen.findByRole('button', { name: 'Abrir menu' }); expect(container.querySelector('video')).toBeNull()
})


it.each(RENDERERS)('%s plays the built-in fallback when a package has no video asset', async id => {
  state.assets = {}
  const { container } = mount(id)
  await screen.findByRole('button', { name: 'Abrir menu' })
  expect(container.querySelectorAll('video')).toHaveLength(1)
  expect(container.querySelector('video')).toHaveAttribute('src', '/theme/default/images/video.mp4')
})

it.each(['warhorn', 'gemwright', 'vesperlyn'] as const)('%s contains keyboard focus and restores the original scroll style', async id => {
  document.body.style.overflow = 'clip'
  mount(id); const user = userEvent.setup()
  const open = await screen.findByRole('button', { name: 'Abrir menu' }); await user.click(open)
  const dialog = screen.getByRole('dialog', { name: 'Navegação móvel' })
  const close = within(dialog).getByRole('button', { name: 'Fechar menu' })
  expect(close).toHaveFocus()
  await user.tab({ shift: true })
  const links = within(dialog).getAllByRole('link')
  expect(links.at(-1)).toHaveFocus()
  await user.tab(); expect(close).toHaveFocus()
  await user.click(within(dialog).getByRole('link', { name: 'Home' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.body.style.overflow).toBe('clip')
  expect(open).toHaveFocus()
})


it.each(RENDERERS)('%s plays Classic video with the actual implicit layout defaults', async id => {
  state.id = 'default'; state.assets = {}
  const { container } = mount(id, true, true)
  await screen.findByRole('button', { name: 'Abrir menu' })
  expect(container.querySelectorAll('video')).toHaveLength(1)
  expect(container.querySelector('video')).toHaveAttribute('src', '/theme/default/images/video.mp4')
})
