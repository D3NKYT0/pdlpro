// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { programsApi, type Resource } from '../services/api'
import { useResourceEnabled } from './useResourceEnabled'

vi.mock('../services/domain/programs.service', () => ({ programsApi: { resources: vi.fn() } }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

function OptionalFeature() {
  const enabled = useResourceEnabled('progress-achievements', 'progress')
  return <div>{enabled ? 'Coleção disponível' : 'Coleção oculta'}</div>
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><OptionalFeature /></QueryClientProvider>)
}

it.each([
  [true, true, true],
  [false, true, false],
  [true, false, false],
])('combina a preferência do filho %s e do pai %s', async (child, parent, enabled) => {
  vi.mocked(programsApi.resources).mockResolvedValue([
    { code: 'progress-achievements', enabled: child },
    { code: 'progress', enabled: parent },
  ] as Resource[])
  mount()
  expect(await screen.findByText(enabled ? 'Coleção disponível' : 'Coleção oculta')).toBeVisible()
})

it('oculta durante carregamento e revela após confirmar o catálogo', async () => {
  let resolve!: (rows: Resource[]) => void
  vi.mocked(programsApi.resources).mockReturnValue(new Promise(done => { resolve = done }))
  mount()
  expect(screen.getByText('Coleção oculta')).toBeVisible()
  resolve([])
  expect(await screen.findByText('Coleção disponível')).toBeVisible()
})

it('mantém a coleção oculta quando a consulta falha', async () => {
  vi.mocked(programsApi.resources).mockRejectedValue(new Error('offline'))
  mount()
  expect(await screen.findByText('Coleção oculta')).toBeVisible()
})
