/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { programsApi } from '../services/api'
import { extensionRouteElements } from './ExtensionRoutes'
import '../i18n'

vi.mock('../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn() },
}))

beforeEach(() => {
  vi.mocked(programsApi.resources).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
})

function mount(enabled: string, path = '/ext/example/ping') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {extensionRouteElements('public', enabled)}
          <Route path="*" element={<p>fallback</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('não monta rotas quando nenhuma extensão está habilitada', () => {
  mount('')
  expect(screen.getByText('fallback')).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Extensão de exemplo' })).toBeNull()
})

it('monta o ping do skeleton quando example está habilitado', async () => {
  mount('example')
  expect(await screen.findByRole('heading', { level: 1, name: 'Extensão de exemplo' })).toBeTruthy()
  expect(screen.queryByText('fallback')).toBeNull()
})

it('bloqueia a rota quando o recurso da extensão está pausado', async () => {
  vi.mocked(programsApi.resources).mockResolvedValue([
    { code: 'ext.example.ping', enabled: false },
  ] as Awaited<ReturnType<typeof programsApi.resources>>)
  mount('example')
  expect(await screen.findByRole('heading', { name: 'Recurso temporariamente desativado' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Extensão de exemplo' })).toBeNull()
})
