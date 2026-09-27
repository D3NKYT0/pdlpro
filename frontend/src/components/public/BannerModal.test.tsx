// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BannerModal } from './BannerModal'
import { contentApi, type ApiBanner } from '../../services/api'

vi.mock('../../services/api', () => ({
  contentApi: {
    banners: vi.fn(),
  },
}))

const sampleFlyerBanner: ApiBanner = {
  id: 'banner-flyer-1',
  title: 'Inauguração Oficial',
  badge: 'NOVO',
  description: '',
  image: 'https://example.com/flyer.webp',
  link: 'https://example.com/launch',
  link_text: 'Ver mais',
  secondary_link: '',
  secondary_link_text: '',
  display_type: 'normal',
  target_location: 'landing',
  dismiss_policy: 'session',
  dismiss_days: 1,
  auto_close: false,
  auto_close_delay: 0,
  show_close_button: true,
  width: 700,
  height: 0,
  order: 1,
}

const sampleRichBanner: ApiBanner = {
  id: 'banner-rich-1',
  title: 'Grande Inauguração',
  badge: 'EVENTO',
  description: 'Participe do servidor com 20% de bônus em adena.',
  image: 'https://example.com/rich.webp',
  link: 'https://example.com/event',
  link_text: 'Garantir Bônus',
  secondary_link: 'https://example.com/rules',
  secondary_link_text: 'Ver Regras',
  display_type: 'popup',
  target_location: 'landing_and_coming_soon',
  dismiss_policy: 'days',
  dismiss_days: 3,
  auto_close: false,
  auto_close_delay: 0,
  show_close_button: true,
  width: 600,
  height: 0,
  order: 2,
}

function renderBannerModal(props: Parameters<typeof BannerModal>[0] = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BannerModal {...props} />
    </QueryClientProvider>,
  )
}

describe('BannerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders rich banner modal when fetched from API', async () => {
    vi.mocked(contentApi.banners).mockResolvedValueOnce([sampleRichBanner])

    renderBannerModal({ location: 'landing' })

    expect(await screen.findByText('Grande Inauguração')).toBeInTheDocument()
    expect(screen.getByText('EVENTO')).toBeInTheDocument()
    expect(
      screen.getByText('Participe do servidor com 20% de bônus em adena.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Garantir Bônus')).toBeInTheDocument()
    expect(screen.getByText('Ver Regras')).toBeInTheDocument()
  })

  it('renders visual flyer when banner is normal display_type', async () => {
    vi.mocked(contentApi.banners).mockResolvedValueOnce([sampleFlyerBanner])

    renderBannerModal({ location: 'landing' })

    const img = await screen.findByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/flyer.webp')
  })

  it('dismisses banner on close button and stores in sessionStorage if policy is session', async () => {
    vi.mocked(contentApi.banners).mockResolvedValueOnce([sampleFlyerBanner])

    renderBannerModal({ location: 'landing' })

    const closeBtn = await screen.findByTitle('Fechar')
    fireEvent.click(closeBtn)

    expect(
      window.sessionStorage.getItem(`pdl_banner_session_dismissed_${sampleFlyerBanner.id}`),
    ).toBe('1')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('dismisses forever in localStorage if "dont show again" checkbox is checked', async () => {
    vi.mocked(contentApi.banners).mockResolvedValueOnce([sampleRichBanner])

    renderBannerModal({ location: 'landing' })

    const checkbox = await screen.findByLabelText('Não mostrar novamente')
    fireEvent.click(checkbox)

    const closeBtn = screen.getByTitle('Fechar')
    fireEvent.click(closeBtn)

    expect(
      window.localStorage.getItem(`pdl_banner_dismissed_${sampleRichBanner.id}`),
    ).toBe('forever')
  })

  it('does not render if banner was already dismissed in localStorage', async () => {
    window.localStorage.setItem(
      `pdl_banner_dismissed_${sampleRichBanner.id}`,
      'forever',
    )
    vi.mocked(contentApi.banners).mockResolvedValueOnce([sampleRichBanner])

    renderBannerModal({ location: 'landing' })

    // Wait a tick to ensure query resolves
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText('Grande Inauguração')).not.toBeInTheDocument()
  })

  it('renders in preview mode directly without calling contentApi', async () => {
    renderBannerModal({ previewBanner: sampleRichBanner })

    expect(screen.getByText('Grande Inauguração')).toBeInTheDocument()
    expect(contentApi.banners).not.toHaveBeenCalled()
  })
})
