// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { ResourceControlsProvider } from './ResourceControlsContext'
import { MicroResource } from '../components/programs/MicroResource'
import { resourceEnabled } from '../lib/resources'
import type { Resource } from '../services/api'

const row = (code: string, enabled = true, parent_code?: string): Resource => ({
  id: code, code, name: code, description: '', category: 'Jogos', enabled, parent_code,
})
const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllGlobals() })

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  const onOpen = vi.fn()
  render(<QueryClientProvider client={client}><ResourceControlsProvider>
    <MicroResource code="games-boxes-open"><button onClick={onOpen}>Abrir caixa</button></MicroResource>
    <MicroResource code="games-boxes-buy"><button>Comprar caixa</button></MicroResource>
    <MicroResource code="wallet-transfer"><button>Transferir</button></MicroResource>
  </ResourceControlsProvider></QueryClientProvider>)
  return { client, onOpen }
}

it('consulta o contrato público e permite somente a operação habilitada', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([
    row('games'), row('games-boxes', true, 'games'),
    row('games-boxes-open', true, 'games-boxes'), row('games-boxes-buy', false, 'games-boxes'),
    row('wallet-transfer', false, 'wallet'),
  ]), { status: 200 }))
  vi.stubGlobal('fetch', fetcher)
  const { onOpen } = mount()
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Abrir caixa' }))
  expect(onOpen).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: 'Comprar caixa' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Transferir' })).not.toBeInTheDocument()
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toBe('/api/v1/public/resources/')
  expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'include' })
})

it('fecha durante carga e erro, abre catálogo vazio e reage à reativação do ancestral', async () => {
  let resolve!: (value: Response) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(done => { resolve = done })))
  const { client } = mount()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  resolve(new Response(JSON.stringify({ message: 'indisponível' }), { status: 403 }))
  await waitFor(() => expect(client.getQueryState(['resources'])?.status).toBe('error'))
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  client.setQueryData(['resources'], [])
  expect(await screen.findByRole('button', { name: 'Abrir caixa' })).toBeVisible()
  const rows = [row('games', false), row('games-boxes', true, 'games'), row('games-boxes-open', true, 'games-boxes')]
  client.setQueryData(['resources'], rows)
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Abrir caixa' })).not.toBeInTheDocument())
  client.setQueryData(['resources'], rows.map(entry => ({ ...entry, enabled: true })))
  expect(await screen.findByRole('button', { name: 'Abrir caixa' })).toBeVisible()
  expect(rows[2].enabled).toBe(true)
})

it('recusa ciclos, respeita pai legado e mantém compatibilidade com controles ausentes', () => {
  expect(resourceEnabled([row('a', true, 'b'), row('b', true, 'a')], 'a')).toBe(false)
  expect(resourceEnabled([row('parent', false)], 'child', 'parent')).toBe(false)
  expect(resourceEnabled([], 'extension-unknown')).toBe(true)
})
