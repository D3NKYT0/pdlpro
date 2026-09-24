/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { dismissBootstrapLoader, GlobalLoadingOverlay, LOADER_STYLE_SELECTOR } from './GlobalLoadingOverlay'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ loading: false }),
}))

vi.mock('../../theme/assets', () => ({
  themeImage: (path: string) => `/theme/${path}`,
}))

afterEach(async () => {
  cleanup()
  if (typeof document !== 'undefined') {
    document.getElementById('app-bootstrap-loader')?.remove()
    document.body?.classList.remove('global-loading')
    document.documentElement?.classList.remove('pdl-booting')
  }
  await i18n.changeLanguage('pt')
})

beforeEach(async () => {
  await i18n.changeLanguage('pt')
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <GlobalLoadingOverlay />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

it('mostra o texto de loading em português', () => {
  mount()
  expect(screen.getByRole('status', { name: 'Carregando a página' })).toBeVisible()
  expect(screen.getByText('Preparando sua jornada')).toBeVisible()
  expect(document.querySelector('.global-loader__crest')).toBeTruthy()
  expect(document.querySelector('.global-loader__wordmark')).toHaveAttribute('src', '/theme/logo.png')
  expect(document.querySelector('.global-loader__progress')).toBeTruthy()
  expect(document.querySelector('.global-loader__marks')).toBeNull()
})

it('espera as folhas estruturais e a folha instalada antes de soltar o splash', () => {
  expect(LOADER_STYLE_SELECTOR).toContain('data-pdl-theme')
  expect(LOADER_STYLE_SELECTOR).toContain('data-pdl-panel-theme')
  expect(LOADER_STYLE_SELECTOR).toContain('data-pdl-installed-theme')
})

it('ao dispensar o splash libera o #root escondido no boot', () => {
  document.documentElement.classList.add('pdl-booting')
  const splash = document.createElement('div')
  splash.id = 'app-bootstrap-loader'
  document.body.append(splash)

  dismissBootstrapLoader()

  expect(document.documentElement).not.toHaveClass('pdl-booting')
  expect(splash).toHaveClass('is-leaving')
  expect(splash).toHaveClass('global-loader--leaving')
})

it('no primeiro boot não empilha o overlay React em cima do splash HTML', () => {
  const splash = document.createElement('div')
  splash.id = 'app-bootstrap-loader'
  splash.setAttribute('role', 'status')
  splash.setAttribute('aria-label', 'Carregando a aplicação')
  splash.innerHTML = '<span>Preparando sua jornada</span>'
  document.body.append(splash)

  mount()

  expect(document.getElementById('app-bootstrap-loader')).toBeTruthy()
  expect(document.querySelector('.global-loader')).toHaveClass('global-loader--hidden')
  expect(document.querySelector('.global-loader')).toHaveAttribute('aria-hidden', 'true')
})

it('traduz o overlay de loading', async () => {
  await i18n.changeLanguage('en')
  mount()
  expect(screen.getByRole('status', { name: 'Loading the page' })).toBeVisible()
  expect(screen.getByText('Preparing your journey')).toBeVisible()
})
