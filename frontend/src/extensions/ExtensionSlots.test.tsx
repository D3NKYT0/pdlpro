/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { programsApi } from '../services/api'
import { ExtensionSlotOutlet } from './ExtensionSlots'
import '../i18n'

vi.mock('../services/domain/programs.service', () => ({
  programsApi: { resources: vi.fn() },
}))

vi.mock('./registry', () => ({
  extensionSlotItems: () => [
    {
      key: 'example:panel.dashboard:0',
      slot: 'panel.dashboard',
      element: <p>bloco da extensão</p>,
      resource: 'ext.example.ping',
    },
  ],
}))

afterEach(() => {
  cleanup()
})

function mount(resources: Array<{ code: string; enabled: boolean }> = []) {
  const rows = resources as Awaited<ReturnType<typeof programsApi.resources>>
  vi.mocked(programsApi.resources).mockResolvedValue(rows)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['resources'], rows)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExtensionSlotOutlet slot="panel.dashboard" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('injeta o bloco quando o recurso está ligado', () => {
  mount([])
  expect(screen.getByText('bloco da extensão')).toBeTruthy()
})

it('omite o bloco quando o recurso está pausado', () => {
  mount([{ code: 'ext.example.ping', enabled: false }])
  expect(screen.queryByText('bloco da extensão')).toBeNull()
})
