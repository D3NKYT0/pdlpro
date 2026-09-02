import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AdminHubPage } from './AdminHubPage'
import { AdminItemObservationPage, Categories, Snapshots } from './AdminItemObservationPage'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'observer' } }) }))

const fullAccess = { capture: true, delete_snapshots: true, add_categories: true, change_categories: true, delete_categories: true }
const readAccess = { capture: false, delete_snapshots: false, add_categories: false, change_categories: false, delete_categories: false }
function renderTab(tab: typeof Categories | typeof Snapshots, data: unknown, writable = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const key = tab === Categories ? ['categories'] : ['snapshots', 1]
  client.setQueryData(['staff-item-observation', 'observer', ...key], data)
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(tab, { access: writable ? fullAccess : readAccess }))))
  client.clear()
  return html
}

describe('panel item observation entry', () => {
  it('guides the first snapshot without rendering an empty table or pagination', () => {
    const html = renderTab(Snapshots, { results: [], count: 0, page: 1, pages: 1 })
    expect(html).toContain('Sua economia ainda não tem histórico')
    expect(html).toContain('Registrar o momento atual')
    expect(html).toContain('Comparar períodos')
    expect(html).toContain('observation-compare-slots')
    expect(html).not.toContain('<table')
    expect(html).not.toContain('aria-label="Paginação"')
  })
  it('renders snapshot actions only for permitted staff', () => {
    const data = { results: [{ id: 'snapshot-id', snapshot_date: '2026-09-01', source: 'test-l2', created_by: 'observer', total_quantity: '100', site_quantity: '0', notes: 'Baseline' }], count: 1, page: 1, pages: 1 }
    const writable = renderTab(Snapshots, data)
    expect(writable).toContain('01/09/2026')
    expect(writable).toContain('Baseline')
    expect(writable).toContain('Excluir snapshot')
    const readonly = renderTab(Snapshots, data, false)
    expect(readonly).toContain('Detalhes')
    expect(readonly).not.toContain('Excluir snapshot')
    expect(readonly).not.toContain('Capturar snapshot')
  })
  it('renders category empty guidance and a structured editor', () => {
    const html = renderTab(Categories, [])
    expect(html).toContain('Dê forma ao seu catálogo')
    expect(html).toContain('Nova categoria')
    expect(html).toContain('observation-editor-grid')
    expect(html).toContain('aria-describedby="observation-ids-help"')
    expect(html).toContain('Salvar categoria')
    expect(renderTab(Categories, [], false)).not.toContain('<form')
  })
  it('shows category cards with bounded icon previews', () => {
    const html = renderTab(Categories, [{ id: 'category-id', name: 'Moedas', description: 'Economia', item_ids: [57, 4037], order: 0 }])
    expect(html).toContain('Moedas')
    expect(html).toContain('2 itens vinculados')
    expect(html).toContain('src="/item-icons/57.jpg"')
    expect(html).toContain('Editar')
    expect(html).toContain('Excluir')
  })
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
      results: [{ item_id: 57, item_name: 'Adena custom XML', catalog_found: true, grade: 'A', item_type: 'WEAPON', tradeable: false, category_name: '', quantity: '9007199254740993', instances: '1', unique_owners: '1', is_favorite: true }],
      categories: [], locations: [], count: 1, page: 1, pages: 1,
    })
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(AdminItemObservationPage))))
    expect(html).toContain('Adena')
    expect(html).toContain('9.007.199.254.740.993')
    expect(html).toContain('Snapshots e comparação')
    expect(html).toContain('Remover favorito: Adena')
    expect(html).toContain('src="/item-icons/57.jpg"')
    expect(html).toContain('Adena custom XML')
    expect(html).toContain('Arma')
    expect(html).toContain('grade-A')
    expect(html).toContain('Não negociável')
    expect(html).not.toContain('href="/admin/')
    client.clear()
  })
})
