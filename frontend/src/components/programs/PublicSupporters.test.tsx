// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ResourceControlsProvider } from '../../contexts/ResourceControlsContext'
import { programsApi, serverApi, contentApi, type Resource } from '../../services/api'
import i18n from '../../i18n'
import { PublicSupporters } from './PublicSupporters'
import { SupporterVisibility } from '../admin/programs/SupporterVisibility'
import { HomePage } from '../../pages/HomePage'

let client: QueryClient
const rows = [
  { id: 'program', code: 'supporters', enabled: true, parent_code: null },
  { id: 'public', code: 'supporters-public', enabled: true, parent_code: 'supporters' },
  { id: 'apply', code: 'supporters-apply', enabled: true, parent_code: 'supporters' },
] as Resource[]
beforeEach(async () => {
  await i18n.changeLanguage('pt')
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.spyOn(programsApi, 'resources').mockResolvedValue(rows.map(row => ({ ...row })))
  vi.spyOn(programsApi, 'publicSupporters').mockResolvedValue([])
})
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks() })
function mount() {
  return render(<QueryClientProvider client={client}><MemoryRouter><ResourceControlsProvider>
    <Routes><Route path="/" element={<PublicSupporters />} /><Route path="/panel/supporters" element={<h1>Candidatura</h1>} /></Routes>
  </ResourceControlsProvider></MemoryRouter></QueryClientProvider>)
}
it('regression: disabled program removes the old supporter strip from the actual landing', async () => {
  vi.mocked(programsApi.resources).mockResolvedValue(rows.map(row => ({ ...row, enabled: row.code !== 'supporters' })))
  vi.spyOn(serverApi, 'info').mockResolvedValue({} as Awaited<ReturnType<typeof serverApi.info>>)
  vi.spyOn(serverApi, 'status').mockResolvedValue({ game_online: false, login_online: false, players_online: 0 })
  vi.spyOn(serverApi, 'rankings').mockResolvedValue([])
  vi.spyOn(contentApi, 'news').mockResolvedValue([])
  vi.spyOn(contentApi, 'wiki').mockResolvedValue([])
  render(<QueryClientProvider client={client}><MemoryRouter><ResourceControlsProvider><HomePage /></ResourceControlsProvider></MemoryRouter></QueryClientProvider>)
  await vi.waitFor(() => expect(client.getQueryState(['resources'])?.status).toBe('success'))
  expect(screen.queryAllByText(i18n.t('home.supporters', { ns: 'public' }))).toHaveLength(0)
  expect(screen.queryByRole('link', { name: 'Solicitar parceria' })).toBeNull()
})
it.each(['supporters', 'supporters-public'])('hides the whole showcase and avoids HTTP when %s is disabled', async code => {
  vi.mocked(programsApi.resources).mockResolvedValue(rows.map(row => ({ ...row, enabled: row.code !== code })))
  mount()
  await vi.waitFor(() => expect(client.getQueryState(['resources'])?.status).toBe('success'))
  expect(screen.queryByText('Apoiadores e afiliados')).toBeNull()
  expect(programsApi.publicSupporters).not.toHaveBeenCalled()
})
it('provides a real application entry even with no approved supporters', async () => {
  mount()
  expect(await screen.findByText('Seja um dos primeiros parceiros do servidor.')).toBeVisible()
  await userEvent.click(screen.getByRole('link', { name: 'Solicitar parceria' }))
  expect(screen.getByRole('heading', { name: 'Candidatura' })).toBeVisible()
})
it('shows public profiles but hides application entry when applications are closed', async () => {
  vi.mocked(programsApi.resources).mockResolvedValue(rows.map(row => ({ ...row, enabled: row.code !== 'supporters-apply' })))
  vi.mocked(programsApi.publicSupporters).mockResolvedValue([{ id: 'creator', name: 'Creator', image: null, channel_url: 'https://example.com' }])
  mount()
  expect(await screen.findByText('Creator')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Solicitar parceria' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Visitar canal de Creator' })).toHaveAttribute('href', 'https://example.com')
})
it('announces loading and failure without publishing fake supporters', async () => {
  let reject!: (error: Error) => void
  vi.mocked(programsApi.publicSupporters).mockImplementation(() => new Promise((_, fail) => { reject = fail }))
  mount()
  expect(await screen.findByText('Carregando apoiadores…')).toBeVisible()
  reject(new Error('Unavailable'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os apoiadores.')
})
it('admin changes public visibility and blocks duplicate submissions while saving', async () => {
  let resolve!: (row: Resource) => void
  vi.spyOn(programsApi, 'toggleResource').mockImplementation(() => new Promise(done => { resolve = done }))
  render(<QueryClientProvider client={client}><SupporterVisibility /></QueryClientProvider>)
  const toggle = await screen.findByRole('checkbox', { name: 'Desativar Apoiadores na landing e rodapé' })
  await userEvent.click(toggle)
  expect(programsApi.toggleResource).toHaveBeenCalledWith('public', false)
  expect(screen.getByRole('checkbox', { name: 'Programa de apoiadores ativo' })).toBeDisabled()
  await userEvent.click(toggle)
  expect(programsApi.toggleResource).toHaveBeenCalledTimes(1)
  resolve({ ...rows[1], enabled: false })
  await vi.waitFor(() => expect(screen.getByRole('checkbox', { name: 'Programa de apoiadores ativo' })).not.toBeDisabled())
})
