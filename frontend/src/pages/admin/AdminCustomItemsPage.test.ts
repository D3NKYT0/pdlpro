import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AdminCustomItemsPage } from './AdminCustomItemsPage'
import { AdminHubPage } from './AdminHubPage'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'staff' } }) }))

function render(writable: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['staff-custom-items', 'staff', '', 1], {
    results: [{ id: 'item-uuid', item_id: 900001, name: 'Medalha custom', icon_url: '/media/custom-items/icon.png', category: 'COMUM', grade: 'S', active: true, tradeable: true, metadata: { raridade: 'raro' }, conflicts_with_xml: false }],
    count: 1, page: 1, pages: 1, permissions: { add: writable, change: writable },
    categories: [{ value: 'COMUM', label: 'Comum' }], grades: [{ value: 'S', label: 'S' }],
  })
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(AdminCustomItemsPage))))
  client.clear()
  return html
}

describe('native custom item administration', () => {
  it('renders media previews and all registration fields for authorized staff', () => {
    const html = render(true)
    for (const label of ['Medalha custom', '900001', 'ID no jogo', 'Metadados adicionais', 'Cadastrar item', 'Desativar', 'type="file"', 'src="/media/custom-items/icon.png"']) expect(html).toContain(label)
    expect(html).toContain('não cria itens no servidor L2')
  })
  it('does not offer uploads or edits for read-only staff', () => {
    const html = render(false)
    expect(html).toContain('Medalha custom')
    expect(html).not.toContain('type="file"')
    expect(html).not.toContain('Cadastrar item')
    expect(html).not.toContain('Desativar')
  })
  it('is discoverable from the admin hub', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminHubPage)))
    expect(html).toContain('href="/painel/admin/itens/customs"')
    expect(html).toContain('Itens customizados')
  })
})
