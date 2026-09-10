import { type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { ITEM_CATALOG_KEY } from '../../services/api'
import { AdminThemesPage } from './AdminThemesPage'
import { AdminCommercePage } from './AdminCommercePage'
import { AdminCustomItemsPage } from './AdminCustomItemsPage'
import { AdminItemObservationPage, Categories, Snapshots } from './AdminItemObservationPage'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'staff' } }) }))

const fullAccess = { capture: true, delete_snapshots: true, add_categories: true, change_categories: true, delete_categories: true }

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

async function withLanguage(language: string, run: () => string) {
  await i18n.changeLanguage(language)
  return run()
}

const seedThemes = (client: QueryClient) => {
  client.setQueryData(['staff-themes'], [
    { id: 'default', package_id: null, name: 'PDL Classic', version: '2.0.0', author: 'PDL', description: '', active: true, builtin: true, base_url: '/theme/default/', stylesheet_url: null, assets: {} },
  ])
}

const seedCustomItems = (client: QueryClient) => {
  client.setQueryData(['staff-custom-items', 'staff', '', 1], {
    results: [{ id: 'item-uuid', item_id: 900001, name: 'Medalha custom', icon_url: null, category: 'COMUM', grade: 'S', active: true, tradeable: true, metadata: {}, conflicts_with_xml: false }],
    count: 1, page: 1, pages: 1, permissions: { add: true, change: true },
    categories: [{ value: 'COMUM', label: 'Comum' }], grades: [{ value: 'S', label: 'S' }],
  })
}

const seedObservation = (client: QueryClient) => {
  client.setQueryData(ITEM_CATALOG_KEY, { items: [], default_icon_url: '/item-icons/default.jpg' })
  client.setQueryData(['staff-item-observation', 'staff', 'access'], fullAccess)
}

afterEach(async () => {
  await i18n.changeLanguage('pt')
})

describe('admin catalog pages follow the active language', () => {
  it('translates the theme installer, its contract and the catalog', async () => {
    expect(await withLanguage('pt', () => render(<AdminThemesPage />, seedThemes))).toContain('Temas compatíveis')
    const english = await withLanguage('en', () => render(<AdminThemesPage />, seedThemes))
    expect(english).toContain('Install theme')
    expect(english).toContain('Compatible themes')
    expect(english).toContain('Available themes')
    expect(english).not.toContain('Temas compatíveis')
    expect(english).not.toContain('Temas disponíveis')
  })

  it('keeps the theme contract markup while translating the copy', async () => {
    const english = await withLanguage('en', () => render(<AdminThemesPage />, seedThemes))
    expect(english).toContain('<strong>schemaVersion</strong>')
    expect(english).toContain('<code>theme.json</code>')
    expect(english).toContain('<code>portal-v1</code>')
    expect(await withLanguage('es', () => render(<AdminThemesPage />, seedThemes))).toContain('Archivos en la raíz')
  })

  it('translates packages and coupons chrome', async () => {
    const english = await withLanguage('en', () => render(<AdminCommercePage />))
    expect(english).toContain('Packages and coupons')
    expect(english).toContain('Create package')
    expect(english).not.toContain('Pacotes e cupons')
    expect(await withLanguage('es', () => render(<AdminCommercePage />))).toContain('Paquetes y cupones')
  })

  it('translates the custom item catalog without touching stored names', async () => {
    const english = await withLanguage('en', () => render(<AdminCustomItemsPage />, seedCustomItems))
    expect(english).toContain('Custom items')
    expect(english).toContain('Custom catalog')
    expect(english).toContain('does not create items on the L2 server')
    expect(english).toContain('Medalha custom')
    expect(english).not.toContain('Catálogo custom')
    expect(await withLanguage('es', () => render(<AdminCustomItemsPage />, seedCustomItems))).toContain('Ítems personalizados')
  })

  it('translates the item watch tabs and snapshot guidance', async () => {
    const english = await withLanguage('en', () => render(<AdminItemObservationPage />, seedObservation))
    expect(english).toContain('Item watch')
    expect(english).toContain('Snapshots and comparison')
    expect(english).not.toContain('Observar itens')
    const history = await withLanguage('en', () =>
      render(<Snapshots access={fullAccess} />, (client) => {
        seedObservation(client)
        client.setQueryData(['staff-item-observation', 'staff', 'snapshots', 1], { results: [], count: 0, page: 1, pages: 1 })
      }),
    )
    expect(history).toContain('Your economy has no history yet')
    expect(history).toContain('Record the current moment')
    expect(history).toContain('Compare periods')
    expect(history).not.toContain('Registrar o momento atual')
  })

  it('translates the item category workspace', async () => {
    const seed = (client: QueryClient) => {
      seedObservation(client)
      client.setQueryData(['staff-item-observation', 'staff', 'categories'], [])
    }
    const english = await withLanguage('en', () => render(<Categories access={fullAccess} />, seed))
    expect(english).toContain('Shape your catalog')
    expect(english).toContain('New category')
    expect(english).toContain('Save category')
    expect(english).not.toContain('Nova categoria')
    expect(await withLanguage('es', () => render(<Categories access={fullAccess} />, seed))).toContain('Nueva categoría')
  })
})
