import { type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { AdminMetricsPage } from './AdminMetricsPage'
import type { ApiMetricsDashboard } from '../../services/api'

function wrap(ui: ReactNode) {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
}

const mockMetrics: ApiMetricsDashboard = {
  registrations_today: 12,
  logins_today: 45,
  revenue_today_brl: 1500.5,
  active_users_24h: 88,
  total_users: 1250,
  total_orders: 340,
  pending_orders: 3,
  failed_webhooks_24h: 0,
  audit_events_24h: 67,
  registrations_series: [
    { label: '2026-09-24', value: 10 },
    { label: '2026-09-25', value: 15 },
    { label: '2026-09-26', value: 12 },
  ],
  revenue_series: [
    { label: '2026-09-24', value: 500 },
    { label: '2026-09-25', value: 1200 },
    { label: '2026-09-26', value: 1500.5 },
  ],
  recent_audit: [
    {
      actor_username: 'gm_danilo',
      action: 'staff.config.update',
      status_code: 200,
      created_at: '2026-09-30T10:00:00Z',
    },
    {
      actor_username: 'staff_ana',
      action: 'staff.moderation.kick',
      status_code: 200,
      created_at: '2026-09-30T10:30:00Z',
    },
  ],
  top_actions: [
    { label: 'staff.config.update', value: 25 },
    { label: 'staff.moderation.kick', value: 12 },
  ],
}

describe('AdminMetricsPage', () => {
  it('renders page header, live badge and description', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const html = renderToStaticMarkup(
      wrap(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminMetricsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      ),
    )
    expect(html).toContain('data-theme-part="page-header"')
    expect(html).toContain('Dashboard de Métricas')
    expect(html).toContain('Observabilidade')
    expect(html).toContain('Ao vivo')
  })

  it('renders KPI values and labels correctly', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    client.setQueryData(['staff-metrics-dashboard'], mockMetrics)

    try {
      const html = renderToStaticMarkup(
        wrap(
          <QueryClientProvider client={client}>
            <MemoryRouter>
              <AdminMetricsPage />
            </MemoryRouter>
          </QueryClientProvider>,
        ),
      )
      expect(html).toContain('12')
      expect(html).toContain('Registros hoje')

      expect(html).toContain('45')
      expect(html).toContain('Logins hoje')

      expect(html).toContain('88')
      expect(html).toContain('Ativos (24h)')

      expect(html).toContain('1250')
      expect(html).toContain('Total de usuários')

      expect(html).toContain('340')
      expect(html).toContain('Total de pedidos')
    } finally {
      client.clear()
    }
  })

  it('renders recent audit table and top actions', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    client.setQueryData(['staff-metrics-dashboard'], mockMetrics)

    try {
      const html = renderToStaticMarkup(
        wrap(
          <QueryClientProvider client={client}>
            <MemoryRouter>
              <AdminMetricsPage />
            </MemoryRouter>
          </QueryClientProvider>,
        ),
      )
      expect(html).toContain('gm_danilo')
      expect(html).toContain('staff.config.update')
      expect(html).toContain('staff_ana')
      expect(html).toContain('staff.moderation.kick')
      expect(html).toContain('Auditoria recente')
      expect(html).toContain('Ações mais frequentes (24h)')
    } finally {
      client.clear()
    }
  })

  it('renders empty audit state when no recent actions exist', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    client.setQueryData(['staff-metrics-dashboard'], {
      ...mockMetrics,
      recent_audit: [],
      top_actions: [],
    })

    try {
      const html = renderToStaticMarkup(
        wrap(
          <QueryClientProvider client={client}>
            <MemoryRouter>
              <AdminMetricsPage />
            </MemoryRouter>
          </QueryClientProvider>,
        ),
      )
      expect(html).toContain('Nenhuma atividade recente.')
      expect(html).toContain('Nenhuma ação registrada.')
    } finally {
      client.clear()
    }
  })
})
