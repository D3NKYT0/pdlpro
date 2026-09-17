// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { programsApi } from '../services/api'
import { RoadmapPage } from './RoadmapPage'

vi.mock('../services/domain/programs.service', () => ({
  programsApi: { roadmap: vi.fn() },
}))

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RoadmapPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(programsApi.roadmap).mockResolvedValue([])
})

afterEach(cleanup)

it('usa o estandarte esmaltado no hero no lugar do ícone Lucide dourado', async () => {
  mount()
  expect(await screen.findByRole('heading', { name: 'Roadmap do servidor' })).toBeVisible()
  expect(document.querySelector('[data-enamel-icon="flag"]')).not.toBeNull()
  expect(document.querySelector('[data-enamel-icon="flag"]')?.classList.contains('enamel-glyph')).toBe(true)
})
