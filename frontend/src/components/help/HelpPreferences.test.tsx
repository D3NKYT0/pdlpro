// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { HelpPreferences } from './HelpPreferences'
import { defaultHelpPreferences, loadHelpPreferences, storeHelpPreferences } from './preferences'
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })
it('aplica sem persistir, salva somente com consentimento e apaga as escolhas', async () => {
  const apply = vi.fn(), user = userEvent.setup()
  render(<HelpPreferences userId="one" language="pt" value={null} disabled={false} onApply={apply} />)
  await user.type(screen.getByRole('textbox'), 'Dani')
  await user.selectOptions(screen.getByRole('combobox'), 'detailed')
  await user.click(screen.getByRole('button', { name: 'Aplicar preferências' }))
  expect(apply).toHaveBeenLastCalledWith({ preferred_name: 'Dani', detail: 'detailed', language: 'pt', remember: false })
  expect(localStorage.length).toBe(0)
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Aplicar preferências' }))
  expect(loadHelpPreferences('one')?.preferred_name).toBe('Dani')
  expect(loadHelpPreferences('two')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Apagar preferências' }))
  expect(loadHelpPreferences('one')).toBeNull()
  expect(apply).toHaveBeenLastCalledWith(defaultHelpPreferences)
})
it('recusa nome inválido, respeita bloqueio e informa armazenamento indisponível', async () => {
  const apply = vi.fn(), user = userEvent.setup()
  const { rerender } = render(<HelpPreferences userId="one" language="en" value={null} disabled={false} onApply={apply} />)
  await user.type(screen.getByRole('textbox'), '123')
  await user.click(screen.getByRole('button', { name: 'Apply preferences' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Use a name')
  expect(apply).not.toHaveBeenCalled()
  await user.clear(screen.getByRole('textbox'))
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked') })
  await user.click(screen.getByRole('button', { name: 'Apply preferences' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Could not update')
  rerender(<HelpPreferences userId="one" language="en" value={null} disabled onApply={apply} />)
  expect(screen.getByRole('textbox')).toBeDisabled()
})
it('descarta valores corrompidos e armazena apenas os campos permitidos', () => {
  expect(loadHelpPreferences()).toBeNull()
  expect(storeHelpPreferences('', defaultHelpPreferences)).toBe(false)
  expect(storeHelpPreferences('one', { ...defaultHelpPreferences, preferred_name: '<script>' })).toBe(false)
  storeHelpPreferences('one', { ...defaultHelpPreferences, remember: true, ...{ context: 'secret' } })
  expect(localStorage.getItem(localStorage.key(0)!)).not.toContain('secret')
  localStorage.setItem(localStorage.key(0)!, '{')
  expect(loadHelpPreferences('one')).toBeNull()
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  expect(loadHelpPreferences('one')).toBeNull()
})
