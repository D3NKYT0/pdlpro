// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'

import { themeApi, type ApiTheme } from '../../services/api'
import { AdminThemesPage } from './AdminThemesPage'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../services/domain/theme.service', () => ({ themeApi: { list: vi.fn(), install: vi.fn(), activate: vi.fn(), remove: vi.fn() } }))

const defaultTheme: ApiTheme = { id: 'default', package_id: null, name: 'PDL Default', version: '2.0.0', author: 'PDL', description: 'Original', active: true, builtin: true, base_url: '/theme/default/', stylesheet_url: null, assets: {} }
const valorem: ApiTheme = { id: 'valorem', package_id: 'id-1', name: 'Valorem', version: '1.0.0', author: 'PDL Team', description: 'Dark fantasy', active: false, builtin: false, base_url: '/media/themes/valorem/', stylesheet_url: '/media/themes/valorem/theme.css', assets: {} }

let client: QueryClient
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><AdminThemesPage /></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(themeApi.list).mockResolvedValue([defaultTheme, valorem])
  vi.mocked(themeApi.install).mockResolvedValue(valorem)
  vi.mocked(themeApi.activate).mockResolvedValue(valorem)
  vi.mocked(themeApi.remove).mockResolvedValue(undefined)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => { cleanup(); client?.clear(); vi.restoreAllMocks() })

it('lista, instala e impede envio repetido enquanto valida o ZIP', async () => {
  let finish!: (value: ApiTheme) => void
  const pending = new Promise<ApiTheme>((resolve) => { finish = resolve })
  vi.mocked(themeApi.install).mockReturnValue(pending)
  const user = mount()
  expect(await screen.findByText('PDL Default')).toBeVisible()
  const file = new File(['package'], 'valorem.zip', { type: 'application/zip' })
  await user.upload(screen.getByLabelText(/Arquivo do tema/), file)
  const install = screen.getByRole('button', { name: 'Instalar pacote' })
  fireEvent.submit(install.closest('form')!)
  await waitFor(() => expect(themeApi.install).toHaveBeenCalledTimes(1))
  const busy = await screen.findByRole('button', { name: 'Validando e instalando…' })
  expect(busy).toBeDisabled()
  await user.click(busy)
  expect(themeApi.install).toHaveBeenCalledTimes(1)
  finish(valorem)
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Tema validado e instalado'))
})

it('ativa tema, restaura o default e remove somente pacote inativo', async () => {
  const user = mount()
  await screen.findByText('Valorem')
  await user.click(screen.getByRole('button', { name: 'Ativar' }))
  expect(themeApi.activate).toHaveBeenCalledWith(valorem)
  await user.click(screen.getByRole('button', { name: 'Remover' }))
  expect(themeApi.remove).toHaveBeenCalledWith(valorem)
})

it('restaura explicitamente o default quando um pacote está ativo', async () => {
  vi.mocked(themeApi.list).mockResolvedValue([{ ...defaultTheme, active: false }, { ...valorem, active: true }])
  vi.mocked(themeApi.activate).mockResolvedValue(defaultTheme)
  const user = mount()
  await user.click(await screen.findByRole('button', { name: 'Ativar' }))
  expect(themeApi.activate).toHaveBeenCalledWith(expect.objectContaining({ id: 'default', builtin: true }))
  expect(toast.success).toHaveBeenCalledWith('Tema default restaurado')
})

it('oferece retry quando a listagem falha', async () => {
  vi.mocked(themeApi.list).mockRejectedValueOnce(new Error('Catálogo indisponível'))
  const user = mount()
  expect(await screen.findByRole('alert')).toHaveTextContent('Catálogo indisponível')
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText('PDL Default')).toBeVisible()
})
