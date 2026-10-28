// @vitest-environment jsdom
import type { ReactNode } from 'react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { serverApi } from '../services/api'
import { useTheme } from '../theme/ThemeProvider'
import { ComingSoonPage } from './ComingSoonPage'
import { InfoPage } from './InfoPage'

vi.mock('../services/api', () => ({ serverApi: { info: vi.fn(), status: vi.fn() } }))
vi.mock('../theme/ThemeProvider', () => ({ useTheme: vi.fn() }))
vi.mock('../components/public/BannerModal', () => ({ BannerModal: () => null }))

const info = {
  name: 'Servidor', slogan: '', description: '', chronicle: 'Interlude', max_level: 80,
  rates: { xp: 'x10', sp: 'x10' }, enchant: {}, features: [], notes: {},
  coming_soon: true, coming_soon_show_info: false, coming_soon_show_champions: false,
  coming_soon_title: '', coming_soon_subtitle: '', coming_soon_at: null,
  staff_only_login: false, allow_registration: true, allow_l2_registration: true,
}

const guideTheme = {
  presentation: null,
  pages: {
    info: { style: 'guide', categories: [{ id: 'general', icon: 'compass', items: ['fairPlay'] }] },
    comingSoon: { style: 'memories', scenes: [{ id: 'village', asset: 'images/memories/village.webp' }] },
  },
}

beforeEach(async () => {
  vi.mocked(serverApi.info).mockResolvedValue(info as never)
  vi.mocked(serverApi.status).mockResolvedValue({ game_online: true } as never)
  Element.prototype.scrollIntoView = vi.fn()
  await i18n.changeLanguage('pt')
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function mount(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/info']}>{ui}</MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

it('tema sem estilo declarado mantém a /info clássica', async () => {
  vi.mocked(useTheme).mockReturnValue({ presentation: null } as never)
  mount(<InfoPage />)
  expect(await screen.findByRole('navigation', { name: /seções/i })).toBeVisible()
  expect(document.querySelector('.info-guide')).toBeNull()
})

it('tema com info.style guide troca a /info pelo guia', async () => {
  vi.mocked(useTheme).mockReturnValue(guideTheme as never)
  mount(<InfoPage />)
  expect(await screen.findByRole('tablist')).toBeVisible()
  expect(document.querySelector('.info-hero')).toBeNull()
})

it('Coming Soon só usa a galeria quando o tema declara memories', () => {
  vi.mocked(useTheme).mockReturnValue({ presentation: null } as never)
  const classic = mount(<ComingSoonPage info={info as never} />)
  expect(document.querySelector('.launch-gate')).not.toBeNull()
  expect(document.querySelector('.launch-memories')).toBeNull()
  classic.unmount()

  vi.mocked(useTheme).mockReturnValue(guideTheme as never)
  mount(<ComingSoonPage info={info as never} />)
  expect(document.querySelector('[data-theme-style="memories"]')).not.toBeNull()
})
