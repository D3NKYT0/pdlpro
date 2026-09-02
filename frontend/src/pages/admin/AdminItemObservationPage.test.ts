import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AdminHubPage } from './AdminHubPage'
import { AdminItemObservationPage } from './AdminItemObservationPage'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'observer' } }) }))

describe('panel item observation entry', () => {
  it('links from the central panel to the native React route', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminHubPage)))
    expect(html).toContain('href="/painel/admin/itens"')
    expect(html).toContain('Observar itens')
  })
  it('renders the live panel with read-only data and exact quantities', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['staff-item-observation', 'observer', 'access'], { capture: true })
    client.setQueryData(['staff-item-observation', 'observer', 'live', { search: '', minimum: '', category: '', favorites: false, sort: 'quantity', page: 1 }], {
      source: 'test-l2', totals: { total_quantity: '9007199254740993', total_instances: '1', total_characters: '1', site_quantity: '0' },
      results: [{ item_id: 57, item_name: 'Adena', category_name: '', quantity: '9007199254740993', instances: '1', unique_owners: '1', is_favorite: true }],
      categories: [], locations: [], count: 1, page: 1, pages: 1,
    })
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(AdminItemObservationPage))))
    expect(html).toContain('Adena')
    expect(html).toContain('9.007.199.254.740.993')
    expect(html).toContain('Snapshots e comparação')
    expect(html).toContain('Remover favorito: Adena')
    expect(html).not.toContain('href="/admin/')
    client.clear()
  })
})
