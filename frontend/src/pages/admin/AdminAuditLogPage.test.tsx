import { type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { AdminAuditLogPage } from './AdminAuditLogPage'
import type { ApiAuditLogPage } from '../../services/api'

function wrap(ui: ReactNode) {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
}

const mockPageData: ApiAuditLogPage = {
  count: 2,
  total_pages: 1,
  results: [
    {
      id: 1,
      actor_id: 10,
      actor_username: 'gm_danilo',
      action: 'staff.config.update',
      request_id: 'req-abc-123',
      ip_address: '192.168.1.100',
      method: 'POST',
      path: '/api/v1/staff/config/',
      status_code: 200,
      target_type: 'config',
      target_id: 'site_settings',
      payload: { field: 'maintenance' },
      created_at: '2026-09-30T10:00:00Z',
    },
    {
      id: 2,
      actor_id: 11,
      actor_username: 'admin_maria',
      action: 'staff.moderation.ban',
      request_id: 'req-xyz-789',
      ip_address: '10.0.0.5',
      method: 'DELETE',
      path: '/api/v1/staff/moderation/ban/1/',
      status_code: 403,
      target_type: 'player',
      target_id: '99',
      payload: {},
      created_at: '2026-09-30T10:15:00Z',
    },
  ],
}

describe('AdminAuditLogPage', () => {
  it('renders page header, kicker and audit badge', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const html = renderToStaticMarkup(
      wrap(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminAuditLogPage />
          </MemoryRouter>
        </QueryClientProvider>,
      ),
    )
    expect(html).toContain('data-theme-part="page-header"')
    expect(html).toContain('Log de Auditoria')
    expect(html).toContain('Observabilidade')
    expect(html).toContain('Auditoria')
  })

  it('renders toolbar with search input and filters button', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const html = renderToStaticMarkup(
      wrap(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminAuditLogPage />
          </MemoryRouter>
        </QueryClientProvider>,
      ),
    )
    expect(html).toContain('id="audit-search"')
    expect(html).toContain('Filtros')
  })

  it('renders audit entries with method badge, actor, path and status code', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    client.setQueryData(['staff-audit-logs', { page: 1, page_size: 20 }], mockPageData)

    try {
      const html = renderToStaticMarkup(
        wrap(
          <QueryClientProvider client={client}>
            <MemoryRouter>
              <AdminAuditLogPage />
            </MemoryRouter>
          </QueryClientProvider>,
        ),
      )
      expect(html).toContain('gm_danilo')
      expect(html).toContain('staff.config.update')
      expect(html).toContain('/api/v1/staff/config/')
      expect(html).toContain('POST')
      expect(html).toContain('200')

      expect(html).toContain('admin_maria')
      expect(html).toContain('staff.moderation.ban')
      expect(html).toContain('DELETE')
      expect(html).toContain('403')
    } finally {
      client.clear()
    }
  })

  it('renders empty message when no audit logs are found', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    client.setQueryData(['staff-audit-logs', { page: 1, page_size: 20 }], {
      count: 0,
      total_pages: 0,
      results: [],
    })

    try {
      const html = renderToStaticMarkup(
        wrap(
          <QueryClientProvider client={client}>
            <MemoryRouter>
              <AdminAuditLogPage />
            </MemoryRouter>
          </QueryClientProvider>,
        ),
      )
      expect(html).toContain('Nenhum registro de auditoria encontrado.')
    } finally {
      client.clear()
    }
  })
})
