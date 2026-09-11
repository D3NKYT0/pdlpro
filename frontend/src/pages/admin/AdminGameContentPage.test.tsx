// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { staffGameContentApi } from '../../services/api'
import { AdminGameContentPage } from './AdminGameContentPage'

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>()
  return {
    ...actual,
    staffGameContentApi: {
      configs: vi.fn(),
      saveConfig: vi.fn(),
    },
  }
})

afterEach(async () => { cleanup(); vi.restoreAllMocks(); await i18n.changeLanguage('pt') })

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><AdminGameContentPage /></MemoryRouter></QueryClientProvider>)
  return client
}

beforeEach(() => {
  vi.mocked(staffGameContentApi.configs).mockImplementation(async (section: string) => {
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
  const client = renderPage()
  expect(await screen.findByRole('heading', { name: 'Temporada 1' })).toBeVisible()
  expect(screen.getByText('Ativo')).toBeVisible()
  expect(screen.getByText('Início')).toBeVisible()
  expect(screen.getByText('Preço premium')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Editar' })).toBeVisible()
  expect(screen.queryByText(/^Ativo:/)).not.toBeInTheDocument()
  client.clear()
})

it('traduz seções, rótulos de campo e status quando o idioma é inglês', async () => {
  await i18n.changeLanguage('en')
  const client = renderPage()
  expect(await screen.findByRole('heading', { name: 'Temporada 1' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Battle pass seasons' })).toBeVisible()
  expect(screen.getByLabelText('Configuration area')).toBeVisible()
  expect(screen.getByText('Premium price')).toBeVisible()
  expect(screen.getByText('Active')).toBeVisible()
  expect(screen.queryByText('Preço premium')).not.toBeInTheDocument()
  client.clear()
})

it('traduz as opções de objetivo e repetição no editor de missões', async () => {
  await i18n.changeLanguage('en')
  const user = userEvent.setup()
  const client = renderPage()
  await user.selectOptions(await screen.findByLabelText('Configuration area'), 'quests')
  await user.click(screen.getByRole('button', { name: 'New record' }))
  expect(await screen.findByRole('option', { name: 'Spin the wheel' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Once per season' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Girar a roda' })).not.toBeInTheDocument()
  client.clear()
})

it('traduz a oficina de recompensas quando o idioma é espanhol', async () => {
  await i18n.changeLanguage('es')
  const client = renderPage()
  expect(await screen.findByRole('heading', { name: 'Temporada 1' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Temporadas del pase' })).toBeVisible()
  expect(screen.getByText('Precio premium')).toBeVisible()
  expect(screen.getByText('Activo')).toBeVisible()
  expect(screen.queryByText('Preço premium')).not.toBeInTheDocument()
  client.clear()
})
