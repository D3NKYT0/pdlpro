// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { ResourceGate } from './ResourceGate'
import { programsApi } from '../../services/domain/programs.service'

vi.mock('../../services/domain/programs.service', () => ({ programsApi: { resources: vi.fn() } }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ResourceGate code="shop"><h1>Loja</h1></ResourceGate></QueryClientProvider>)
}
it('não revela conteúdo durante carregamento', () => {
  vi.mocked(programsApi.resources).mockReturnValue(new Promise(() => {}))
  mount()
  expect(screen.getByRole('status')).toBeTruthy()
  expect(screen.queryByText('Loja')).toBeNull()
})
it('mostra falha de consulta sem liberar o conteúdo', async () => {
  vi.mocked(programsApi.resources).mockRejectedValue(new Error('Servidor indisponível'))
  mount()
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Servidor indisponível')
  expect(screen.queryByText('Loja')).toBeNull()
})
it.each([true, false])('obedece configuração enabled=%s', async enabled => {
  vi.mocked(programsApi.resources).mockResolvedValue([{ code: 'shop', enabled }] as any)
  mount()
  expect(await screen.findByRole('heading', { name: enabled ? 'Loja' : 'Recurso temporariamente desativado' })).toBeTruthy()
})
