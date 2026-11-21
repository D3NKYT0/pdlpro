/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Select } from './Select'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('abre a lista focando com preventScroll para não empurrar a página', async () => {
  const user = userEvent.setup()
  const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus')
  render(
    <Select
      value="pt"
      options={[
        { value: 'pt', label: 'Português' },
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
      ]}
      aria-label="Idioma"
      onChange={() => {}}
    />,
  )

  await user.click(screen.getByRole('combobox', { name: 'Idioma' }))
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
})

it('confirma a opção ao completar o toque e devolve o foco ao seletor', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(
    <Select
      value="pt"
      options={[{ value: 'pt', label: 'Português' }, { value: 'en', label: 'English' }]}
      aria-label="Idioma"
      onChange={onChange}
    />,
  )

  const trigger = screen.getByRole('combobox', { name: 'Idioma' })
  await user.click(trigger)
  await user.pointer({ keys: '[TouchA>]', target: screen.getByRole('option', { name: 'English' }) })
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.getByRole('listbox')).toBeVisible()

  await user.pointer({ keys: '[/TouchA]' })
  expect(onChange).toHaveBeenCalledExactlyOnceWith('en')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
