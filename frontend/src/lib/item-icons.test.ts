import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { ITEM_CATALOG_KEY, indexItemCatalog, searchCatalog, type ItemCatalogResponse } from './item-icons'
import { ItemIcon } from '../components/ItemIcon'
import { ItemIdField } from '../components/ItemIdField'

const data: ItemCatalogResponse = {
  default_icon_url: '/assets/custom-fallback.jpg',
  items: [{ id: '57', name: 'Moéda Custom', category: 'COMUM', grade: 'NG', icon_url: '/assets/server-coin.jpg', icon_reference: 'icon.coin', tradeable: true, catalog_found: true }],
}

describe('single backend item catalog', () => {
  it('searches only the API payload by ID or normalized name', () => {
    const catalog = indexItemCatalog(data)
    expect(searchCatalog(catalog, '57')[0].name).toBe('Moéda Custom')
    expect(searchCatalog(catalog, '#57')[0].id).toBe('57')
    expect(searchCatalog(catalog, 'moeda')[0].id).toBe('57')
    expect(searchCatalog(catalog, 'Adena')).toEqual([])
    expect(searchCatalog(undefined, '57')).toEqual([])
  })
  it('uses the backend icon URL, not a guessed path or legacy name', () => {
    const client = new QueryClient()
    client.setQueryData(ITEM_CATALOG_KEY, data)
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(ItemIcon, { itemId: 57, name: 'Adena' })))
    expect(html).toContain('src="/assets/server-coin.jpg"')
    expect(html).toContain('alt="Moéda Custom"')
    expect(html).not.toContain('/item-icons/57.jpg')
    client.clear()
  })
  it('does not resolve an unknown ID using the name of another item', () => {
    const client = new QueryClient()
    client.setQueryData(ITEM_CATALOG_KEY, data)
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(ItemIcon, { itemId: 99999, name: 'Moéda Custom' })))
    expect(html).toContain('src="/assets/custom-fallback.jpg"')
    client.clear()
  })
  it('prefills the selector from the same cache as the item icon', () => {
    const client = new QueryClient()
    client.setQueryData(ITEM_CATALOG_KEY, data)
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(ItemIdField, { value: '57', onChange: () => {} })))
    expect(html).toContain('57 — Moéda Custom')
    expect(html).toContain('src="/assets/server-coin.jpg"')
    client.clear()
  })
})
