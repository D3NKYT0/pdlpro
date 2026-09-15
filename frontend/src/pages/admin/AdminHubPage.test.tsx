import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AdminHubPage } from './AdminHubPage'

vi.mock('../../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn(async () => []) },
}))

describe('AdminHubPage', () => {
  it('marca cada módulo com tom de cor para leitura rápida', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(MemoryRouter, null, createElement(AdminHubPage)),
      ),
    )
    for (const tone of ['programs', 'support', 'system', 'reports', 'finance', 'games', 'content', 'server']) {
      expect(html).toContain(`data-tone="${tone}"`)
    }
    expect(html).toContain('Programas e expansão')
    expect(html).toContain('Fila de chamados')
    expect(html).toMatch(/data-tone="system"[\s\S]*Controle de recursos/)
    expect(html).toMatch(/data-tone="system"[\s\S]*href="\/api\/docs\/swagger-ui\/"[\s\S]*API/)
    expect(html).toContain('Documentação OpenAPI (Swagger)')
    expect(html).not.toMatch(/data-tone="programs"[\s\S]*Controle de recursos[\s\S]*data-tone="support"/)
    expect(html).toMatch(/data-tone="reports"[\s\S]*Relatórios/)
    expect(html).not.toMatch(/data-tone="finance"[\s\S]*Relatórios[\s\S]*data-tone="games"/)
    expect(html).toMatch(/data-tone="content"[\s\S]*Roadmap/)
    expect(html).toMatch(/data-tone="content"[\s\S]*Calendário/)
    expect(html).toMatch(/data-tone="content"[\s\S]*FAQ/)
    expect(html).toMatch(/data-tone="support"[\s\S]*Avisos/)
    expect(html).not.toMatch(/data-tone="programs"[\s\S]*Roadmap[\s\S]*data-tone="support"/)
    expect(html).toMatch(/data-tone="finance"[\s\S]*Configuração da carteira/)
    expect(html).toMatch(/data-tone="server"[\s\S]*Painel e servidor/)
    expect(html).not.toMatch(/data-tone="system"[\s\S]*Painel e servidor[\s\S]*data-tone="finance"/)
  })
})
