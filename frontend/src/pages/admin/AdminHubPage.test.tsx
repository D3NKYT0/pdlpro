import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminHubPage } from './AdminHubPage'

describe('AdminHubPage', () => {
  it('marca cada módulo com tom de cor para leitura rápida', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminHubPage)))
    for (const tone of ['programs', 'support', 'system', 'finance', 'games', 'content', 'server']) {
      expect(html).toContain(`data-tone="${tone}"`)
    }
    expect(html).toContain('Programas e expansão')
    expect(html).toContain('Fila de chamados')
    expect(html).toMatch(/data-tone="system"[\s\S]*Controle de recursos/)
    expect(html).not.toMatch(/data-tone="programs"[\s\S]*Controle de recursos[\s\S]*data-tone="support"/)
    expect(html).toMatch(/data-tone="content"[\s\S]*Roadmap/)
    expect(html).not.toMatch(/data-tone="programs"[\s\S]*Roadmap[\s\S]*data-tone="support"/)
    expect(html).toMatch(/data-tone="finance"[\s\S]*Configuração da carteira/)
    expect(html).toMatch(/data-tone="server"[\s\S]*Painel e servidor/)
    expect(html).not.toMatch(/data-tone="system"[\s\S]*Painel e servidor[\s\S]*data-tone="finance"/)
  })
})
