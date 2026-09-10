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
  presentation: { renderer: 'portal-v1' } as ApiTheme['presentation'],
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
  document.documentElement.removeAttribute('data-pdl-renderer')
  document.documentElement.removeAttribute('data-panel-density')
  document.documentElement.style.cssText = ''
  vi.restoreAllMocks()
})

it('aplica o default preservado retornado pela API', async () => {
  vi.mocked(themeApi.active).mockResolvedValue({
    id: 'default', package_id: null, name: 'PDL Classic', version: '2.0.0', author: 'PDL',
    description: '', active: true, builtin: true, base_url: '/theme/default/',
    stylesheet_url: null, assets: {}, layout: null,
  })
  render(<ThemeProvider><Consumer /></ThemeProvider>)
  expect(await screen.findByText(/PDL Classic/)).toHaveTextContent('/theme/default/images/logo.png')
  expect(document.documentElement.dataset.pdlTheme).toBe('default')
  expect(document.documentElement.dataset.panelDensity).toBe('comfortable')
  expect(document.documentElement.style.getPropertyValue('--theme-button-primary')).toContain('/theme/default/images/button/1.png')
})

it('carrega CSS e resolve somente os assets declarados pelo pacote', async () => {
  vi.mocked(themeApi.active).mockResolvedValue(valorem)
  render(<ThemeProvider><Consumer /></ThemeProvider>)
  await waitFor(() => expect(document.querySelector('link[data-pdl-installed-theme="valorem"]')).not.toBeNull())
  fireEvent.load(document.querySelector('link[data-pdl-installed-theme="valorem"]')!)
  expect(await screen.findByText(/Valorem/)).toHaveTextContent('/media/themes/valorem/images/logo.png')
  expect(screen.getByText(/Valorem/)).toHaveTextContent('/theme/default/images/missing.png')
  expect(document.documentElement.dataset.pdlRenderer).toBe('portal-v1')
})

it('injeta knobs de layout como CSS variables', async () => {
  vi.mocked(themeApi.active).mockResolvedValue({
    ...valorem,
    assets: {
      ...valorem.assets,
      'images/button/1.png': '/media/themes/valorem/images/button-a.png',
      'images/button/2.png': '/media/themes/valorem/images/button-b.png',
    },
    layout: {
      panel: { sidebarWidth: 300, density: 'compact', radius: 8 },
      public: { headerHeight: 64, containerWidth: 1100 },
      surfaces: {
        buttonPrimary: 'images/button/1.png',
        buttonSecondary: 'images/button/2.png',
      },
    },
  })
  render(<ThemeProvider><Consumer /></ThemeProvider>)
  await waitFor(() => expect(document.querySelector('link[data-pdl-installed-theme="valorem"]')).not.toBeNull())
  fireEvent.load(document.querySelector('link[data-pdl-installed-theme="valorem"]')!)
  await screen.findByText(/Valorem/)
  expect(document.documentElement.dataset.panelDensity).toBe('compact')
  expect(document.documentElement.style.getPropertyValue('--panel-sidebar-width')).toBe('300px')
  expect(document.documentElement.style.getPropertyValue('--panel-radius')).toBe('8px')
  expect(document.documentElement.style.getPropertyValue('--public-header-height')).toBe('64px')
  expect(document.documentElement.style.getPropertyValue('--public-container-width')).toBe('1100px')
  expect(document.documentElement.style.getPropertyValue('--theme-button-primary')).toContain('button-a.png')
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
      id: 'default', package_id: null, name: 'PDL Classic', builtin: true,
      base_url: '/theme/default/', stylesheet_url: null, assets: {}, presentation: null, layout: null,
    })

  render(<ThemeProvider><Consumer /></ThemeProvider>)
  await waitFor(() => expect(document.querySelector('link[data-pdl-installed-theme="valorem"]')).not.toBeNull())
  fireEvent.load(document.querySelector('link[data-pdl-installed-theme="valorem"]')!)
  await screen.findByText(/Valorem/)
  expect(favicon.getAttribute('href')).toBe('/media/themes/valorem/images/favicon.png')

  fireEvent(window, new Event('pdl-theme-refresh'))
  await screen.findByText(/PDL Classic/)
  expect(favicon.getAttribute('href')).toBe('/favicon-original.png')
  expect(document.querySelector('link[data-pdl-installed-theme]')).toBeNull()
  expect(document.documentElement).not.toHaveAttribute('data-pdl-renderer')
})