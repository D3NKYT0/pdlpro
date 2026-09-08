// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { programsApi } from '../../services/domain/programs.service'
import { AdminGameContentPage } from './AdminGameContentPage'

vi.mock('../../services/domain/programs.service', () => ({
  programsApi: {
    configs: vi.fn(),
    saveConfig: vi.fn(),
  },
}))

afterEach(() => { cleanup(); vi.restoreAllMocks() })

beforeEach(() => {
  vi.mocked(programsApi.configs).mockImplementation(async (section: string) => {
    if (section === 'seasons') {
      return [{
        id: 's1', name: 'Temporada 1', starts_at: '2026-08-30T23:08:17Z', ends_at: '2026-11-29T23:08:17Z',
        premium_price: 50, active: true,
      }]
    }
    return []
  })
})

it('mostra temporadas em cartões densos com metadados e status', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><AdminGameContentPage /></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByRole('heading', { name: 'Temporada 1' })).toBeVisible()
  expect(screen.getByText('Ativo')).toBeVisible()
  expect(screen.getByText('Início')).toBeVisible()
  expect(screen.getByText('Preço premium')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Editar' })).toBeVisible()
  expect(screen.queryByText(/^Ativo:/)).not.toBeInTheDocument()
  client.clear()
})
