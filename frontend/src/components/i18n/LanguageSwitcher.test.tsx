/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { LANGUAGE_STORAGE_KEY } from '../../i18n/locale'
import { LanguageSwitcher } from './LanguageSwitcher'

beforeEach(async () => {
  localStorage.clear()
  await i18n.changeLanguage('pt')
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('persists language choice and updates document lang', async () => {
  const user = userEvent.setup()
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageSwitcher />
    </I18nextProvider>,
  )
  const trigger = screen.getByRole('combobox', { name: 'Idioma do site' })
  expect(trigger.closest('[data-theme-part="select"]')).toBeTruthy()
  await user.click(trigger)
  await user.click(screen.getByRole('option', { name: 'Español' }))
  expect(i18n.language).toBe('es')
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es')
  expect(document.documentElement.lang).toBe('es')
  expect(screen.getByRole('combobox', { name: 'Idioma del sitio' })).toBeTruthy()
})
