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
import { GlobalLoadingOverlay } from './GlobalLoadingOverlay'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ loading: false }),
}))

vi.mock('../../theme/assets', () => ({
  themeImage: (path: string) => `/theme/${path}`,
}))

afterEach(async () => {
  cleanup()
  document.getElementById('app-bootstrap-loader')?.remove()
  document.body.classList.remove('global-loading')
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
  expect(document.querySelector('.global-loader__marks')).toBeTruthy()
  expect(document.querySelector('.global-loader__wordmark')).toBeTruthy()
  expect(document.querySelector('.global-loader__progress')).toBeTruthy()
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
