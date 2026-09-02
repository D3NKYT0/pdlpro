// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { themeApi, type ApiTheme } from '../services/api'
import { themeImage } from './assets'
import { ThemeProvider, useTheme } from './ThemeProvider'

vi.mock('../services/domain/theme.service', () => ({ themeApi: { active: vi.fn() } }))

const valorem: ApiTheme = {
  id: 'valorem', package_id: 'theme-id', name: 'Valorem', version: '1.0.0', author: 'PDL',
  description: '', active: true, builtin: false, base_url: '/media/themes/valorem/',
  stylesheet_url: '/media/themes/valorem/theme.css',
  assets: { 'images/logo.png': '/media/themes/valorem/images/logo.png' },
}

function Consumer() {
  const theme = useTheme()
  return <span>{theme.name}|{themeImage('logo.png')}|{themeImage('missing.png')}</span>
}

beforeEach(() => vi.mocked(themeApi.active).mockReset())
afterEach(() => {
  cleanup()
  document.querySelectorAll('link[data-pdl-installed-theme]').forEach((link) => link.remove())
  document.querySelectorAll('link[rel="icon"]').forEach((link) => link.remove())
  document.documentElement.removeAttribute('data-pdl-theme')
  vi.restoreAllMocks()
})

it('aplica o default preservado retornado pela API', async () => {
  vi.mocked(themeApi.active).mockResolvedValue({
    id: 'default', package_id: null, name: 'PDL Default', version: '2.0.0', author: 'PDL',
    description: '', active: true, builtin: true, base_url: '/theme/default/',
    stylesheet_url: null, assets: {},
  })
  render(<ThemeProvider><Consumer /></ThemeProvider>)
  expect(await screen.findByText(/PDL Default/)).toHaveTextContent('/theme/default/images/logo.png')
  expect(document.documentElement.dataset.pdlTheme).toBe('default')
})

it('carrega CSS e resolve somente os assets declarados pelo pacote', async () => {
  vi.mocked(themeApi.active).mockResolvedValue(valorem)
  render(<ThemeProvider><Consumer /></ThemeProvider>)
  await waitFor(() => expect(document.querySelector('link[data-pdl-installed-theme="valorem"]')).not.toBeNull())
  fireEvent.load(document.querySelector('link[data-pdl-installed-theme="valorem"]')!)
  expect(await screen.findByText(/Valorem/)).toHaveTextContent('/media/themes/valorem/images/logo.png')
  expect(screen.getByText(/Valorem/)).toHaveTextContent('/theme/default/images/missing.png')
})

it('restaura o favicon original ao voltar para o tema default', async () => {
  const favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.href = '/favicon-original.png'
  document.head.appendChild(favicon)
  const themed = {
    ...valorem,
    assets: { ...valorem.assets, 'images/favicon.png': '/media/themes/valorem/images/favicon.png' },
  }
  vi.mocked(themeApi.active)
    .mockResolvedValueOnce(themed)
    .mockResolvedValueOnce({
      ...themed,
      id: 'default', package_id: null, name: 'PDL Default', builtin: true,
      base_url: '/theme/default/', stylesheet_url: null, assets: {},
    })

  render(<ThemeProvider><Consumer /></ThemeProvider>)
  await waitFor(() => expect(document.querySelector('link[data-pdl-installed-theme="valorem"]')).not.toBeNull())
  fireEvent.load(document.querySelector('link[data-pdl-installed-theme="valorem"]')!)
  await screen.findByText(/Valorem/)
  expect(favicon.getAttribute('href')).toBe('/media/themes/valorem/images/favicon.png')

  fireEvent(window, new Event('pdl-theme-refresh'))
  await screen.findByText(/PDL Default/)
  expect(favicon.getAttribute('href')).toBe('/favicon-original.png')
  expect(document.querySelector('link[data-pdl-installed-theme]')).toBeNull()
})
