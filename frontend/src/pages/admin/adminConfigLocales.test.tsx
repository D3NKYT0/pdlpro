import { type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '../../i18n'
import { ITEM_CATALOG_KEY, type ApiTheme } from '../../services/api'
import { AdminServerPage } from './AdminServerPage'
import { AdminThemesPage } from './AdminThemesPage'
import { AdminCommercePage } from './AdminCommercePage'
import { AdminGameContentPage } from './AdminGameContentPage'
import { AdminCustomItemsPage } from './AdminCustomItemsPage'
import { Snapshots } from './AdminItemObservationPage'
import { AdminResourcesSection } from '../../components/admin/programs/AdminResourcesSection'
import { AdminRoadmapSection } from '../../components/admin/programs/AdminRoadmapSection'
import { AdminSupportersSection } from '../../components/admin/programs/AdminSupportersSection'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'staff' } }) }))

const theme: ApiTheme = {
  id: 'valorem', package_id: 'id-1', name: 'Valorem', version: '1.0.0', author: 'PDL Team',
  description: 'Dark fantasy', active: false, builtin: false, base_url: '/media/themes/valorem/',
  stylesheet_url: '/media/themes/valorem/theme.css', assets: {},
}

function render(ui: ReactNode, seed?: (client: QueryClient) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  seed?.(client)
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>,
    )
  } finally {
    client.clear()
  }
}

async function inLanguage(language: string, run: () => string) {
  await i18n.changeLanguage(language)
  return run()
}

afterEach(async () => {
  await i18n.changeLanguage('pt')
})

describe('admin configuration pages follow the active language', () => {
  it('translates the server settings form', async () => {
    expect(await inLanguage('pt', () => render(<AdminServerPage />))).toContain('Informações do servidor')
    const english = await inLanguage('en', () => render(<AdminServerPage />))
    expect(english).toContain('Server information')
    expect(english).toContain('Server rates')
    expect(english).not.toContain('Informações do servidor')
    expect(await inLanguage('es', () => render(<AdminServerPage />))).toContain('Información del servidor')
  })

  it('translates the theme installer and keeps the package contract markup', async () => {
    const seed = (client: QueryClient) => client.setQueryData(['staff-themes'], [theme])
    const portuguese = await inLanguage('pt', () => render(<AdminThemesPage />, seed))
    expect(portuguese).toContain('Temas compatíveis')
    expect(portuguese).toContain('por PDL Team')
    const english = await inLanguage('en', () => render(<AdminThemesPage />, seed))
    expect(english).toContain('Compatible themes')
    expect(english).toContain('<strong>schemaVersion</strong>')
    expect(english).toContain('<code>theme.json</code>')
    expect(english).toContain('1 themes')
    expect(english).not.toContain('Temas compatíveis')
    expect(await inLanguage('es', () => render(<AdminThemesPage />, seed))).toContain('Temas compatibles')
  })

  it('translates the packages and coupons workspace', async () => {
    expect(await inLanguage('pt', () => render(<AdminCommercePage />))).toContain('Pacotes e cupons')
    const english = await inLanguage('en', () => render(<AdminCommercePage />))
    expect(english).toContain('Packages and coupons')
    expect(english).toContain('Create package')
    expect(english).not.toContain('Pacotes e cupons')
    expect(await inLanguage('es', () => render(<AdminCommercePage />))).toContain('Paquetes y cupones')
  })

  it('translates the rewards workshop sections and field labels', async () => {
    const portuguese = await inLanguage('pt', () => render(<AdminGameContentPage />))
    expect(portuguese).toContain('Temporadas do passe')
    expect(portuguese).toContain('Oficina de recompensas')
    const english = await inLanguage('en', () => render(<AdminGameContentPage />))
    expect(english).toContain('Rewards workshop')
    expect(english).toContain('Battle pass seasons')
    expect(english).toContain('Fishing baits')
    expect(english).not.toContain('Temporadas do passe')
    expect(await inLanguage('es', () => render(<AdminGameContentPage />))).toContain('Taller de recompensas')
  })

  it('translates the custom item catalog editor', async () => {
    const seed = (client: QueryClient) => client.setQueryData(['staff-custom-items', 'staff', '', 1], {
      results: [], count: 0, page: 1, pages: 1,
      permissions: { add: true, change: true },
      categories: [{ value: 'COMUM', label: 'Comum' }], grades: [{ value: 'S', label: 'S' }],
    })
    expect(await inLanguage('pt', () => render(<AdminCustomItemsPage />, seed))).toContain('ID no jogo')
    const english = await inLanguage('en', () => render(<AdminCustomItemsPage />, seed))
    expect(english).toContain('Custom items')
    expect(english).toContain('In-game ID')
    expect(english).not.toContain('ID no jogo')
    expect(await inLanguage('es', () => render(<AdminCustomItemsPage />, seed))).toContain('ID en el juego')
  })

  it('translates the item watch snapshot guidance', async () => {
    const access = { capture: true, delete_snapshots: true, add_categories: true, change_categories: true, delete_categories: true }
    const seed = (client: QueryClient) => {
      client.setQueryData(ITEM_CATALOG_KEY, { items: [], default_icon_url: '/item-icons/default.jpg' })
      client.setQueryData(['staff-item-observation', 'staff', 'snapshots', 1], { results: [], count: 0, page: 1, pages: 1 })
    }
    expect(await inLanguage('pt', () => render(<Snapshots access={access} />, seed))).toContain('Sua economia ainda não tem histórico')
    const english = await inLanguage('en', () => render(<Snapshots access={access} />, seed))
    expect(english).toContain('Your economy has no history yet')
    expect(english).toContain('Capture snapshot')
    expect(english).not.toContain('Capturar snapshot')
    expect(await inLanguage('es', () => render(<Snapshots access={access} />, seed))).toContain('Tu economía todavía no tiene historial')
  })

  it('translates the resource, roadmap and supporter sections', async () => {
    expect(await inLanguage('pt', () => render(<AdminResourcesSection />))).toContain('Controle de recursos')
    expect(await inLanguage('en', () => render(<AdminResourcesSection />))).toContain('Resource control')
    expect(await inLanguage('es', () => render(<AdminResourcesSection />))).toContain('Control de recursos')

    expect(await inLanguage('pt', () => render(<AdminRoadmapSection />))).toContain('Gerenciar roadmap')
    const roadmapEnglish = await inLanguage('en', () => render(<AdminRoadmapSection />))
    expect(roadmapEnglish).toContain('Manage roadmap')
    expect(roadmapEnglish).toContain('New update')
    expect(roadmapEnglish).not.toContain('Nova atualização')
    expect(await inLanguage('es', () => render(<AdminRoadmapSection />))).toContain('Gestionar el roadmap')

    expect(await inLanguage('pt', () => render(<AdminSupportersSection />))).toContain('Apoiadores e comissões')
    const supportersEnglish = await inLanguage('en', () => render(<AdminSupportersSection />))
    expect(supportersEnglish).toContain('Supporters and commissions')
    expect(supportersEnglish).toContain('Commission requests')
    expect(supportersEnglish).not.toContain('Apoiadores e comissões')
    expect(await inLanguage('es', () => render(<AdminSupportersSection />))).toContain('Patrocinadores y comisiones')
  })

  it('keeps the admin chrome back link translated', async () => {
    expect(await inLanguage('pt', () => render(<AdminResourcesSection />))).toContain('Central')
    expect(await inLanguage('en', () => render(<AdminResourcesSection />))).toContain('Hub')
  })
})
