// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../i18n'
import {
  COOKIE_POLICY_VERSION,
  COOKIE_STORAGE_KEY,
  CookieConsentProvider,
} from '../../contexts/CookieConsentContext'
import { CookieConsentBanner } from './CookieConsentBanner'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function mount() {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <CookieConsentProvider>
          <CookieConsentBanner />
        </CookieConsentProvider>
      </MemoryRouter>
    </I18nextProvider>,
  )
  return userEvent.setup()
}

it('mostra banner até aceitar e persiste consentimento versionado', async () => {
  const user = mount()
  const banner = screen.getByRole('dialog', { name: /cookies/i })
  expect(banner).toBeTruthy()
  expect(banner.getAttribute('data-theme-surface')).toBe('overlay')
  expect(banner.getAttribute('data-theme-part')).toBe('cookie-banner')
  await user.click(screen.getByRole('button', { name: /aceitar todos/i }))
  expect(screen.queryByRole('dialog', { name: /cookies/i })).toBeNull()
  const stored = JSON.parse(localStorage.getItem(COOKIE_STORAGE_KEY) || '{}')
  expect(stored.version).toBe(COOKIE_POLICY_VERSION)
  expect(stored.preferences.analytics).toBe(true)
})

it('reexibe banner quando a versão da política muda', () => {
  localStorage.setItem(
    COOKIE_STORAGE_KEY,
    JSON.stringify({
      preferences: { essential: true, functional: true, analytics: false, marketing: false },
      decidedAt: '2026-01-01T00:00:00.000Z',
      version: '1999-01-01',
    }),
  )
  mount()
  expect(screen.getByRole('dialog', { name: /cookies/i })).toBeTruthy()
})

it('permite rejeitar opcionais', async () => {
  const user = mount()
  await user.click(screen.getByRole('button', { name: /só essenciais/i }))
  const stored = JSON.parse(localStorage.getItem(COOKIE_STORAGE_KEY) || '{}')
  expect(stored.preferences.functional).toBe(false)
  expect(stored.preferences.analytics).toBe(false)
  expect(stored.preferences.marketing).toBe(false)
})
