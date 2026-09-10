import { type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { AdminReportsPage } from './AdminReportsPage'
import type { OperationalReport } from '../../services/api'

function wrap(ui: ReactNode) {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
}

function renderOps(data: OperationalReport, category: string, search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['staff-operational-report', data.kind, search], data)
  try {
    return renderToStaticMarkup(
      wrap(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[`/panel/admin/reports/${category}?${search}`]}>
            <Routes>
              <Route path="/panel/admin/reports/:category/:report?" element={<AdminReportsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      ),
    )
  } finally {
    client.clear()
  }
}

describe('operational reports area', () => {
  it('lists report categories in the hub', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const html = renderToStaticMarkup(
      wrap(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/panel/admin/reports']}>
            <Routes>
              <Route path="/panel/admin/reports" element={<AdminReportsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      ),
    )
    expect(html).toContain('Financeiro')
    expect(html).toContain('Inventário')
    expect(html).toContain('Leilões')
    expect(html).toContain('Compras da loja')
    expect(html).toContain('Marketplace')
  })

  it('renders inventory metrics and daily rows', () => {
    const html = renderOps(
      {
        kind: 'inventory',
        count: 1,
        total_pages: 1,
        next: null,
        previous: null,
        summary: {
          window_days: 15,
          log_count: 3,
          unique_items: 2,
          unique_users: 2,
          actions: { RETIROU_DO_JOGO: { quantity: 100, events: 1 } },
          top_items: [],
          top_users: [],
          series: [],
        },
        results: [{ day: '2026-09-01', actions: { RETIROU_DO_JOGO: 100 }, total_quantity: 100, event_count: 1 }],
      },
      'inventory',
    )
    expect(html).toContain('01/09/2026')
    expect(html).toContain('Retirou do jogo')
    expect(html).not.toContain('Carregando relatório')
  })

  it('renders auction and marketplace empty states', () => {
    const auctions = renderOps(
      {
        kind: 'auctions',
        count: 0,
        total_pages: 1,
        next: null,
        previous: null,
        summary: { auction_count: 0, open_count: 0, finished_count: 0, bid_count: 0 },
        results: [],
      },
      'auctions',
    )
    expect(auctions).toContain('Nenhum registro encontrado')
    const market = renderOps(
      {
        kind: 'marketplace',
        count: 0,
        total_pages: 1,
        next: null,
        previous: null,
        summary: { listing_count: 0, for_sale_count: 0, sold_count: 0, sold_revenue: '0.00' },
        results: [],
      },
      'marketplace',
    )
    expect(market).toContain('Receita vendida')
  })
})
