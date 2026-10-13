// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import i18n from '../../i18n'
import { DeleteRecordButton } from './DeleteRecordButton'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
beforeEach(async () => { await i18n.changeLanguage('pt') })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks() })

it('confirms the record name and cancels without sending', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const remove = vi.fn()
  render(<DeleteRecordButton name="Notícia" onDelete={remove} />)
  await userEvent.click(screen.getByRole('button', { name: 'Excluir Notícia' }))
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Notícia'))
  expect(remove).not.toHaveBeenCalled()
})

it('blocks repeated submissions until success', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  let finish!: () => void
  const remove = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  render(<DeleteRecordButton name="Notícia" onDelete={remove} />)
  const button = screen.getByRole('button', { name: 'Excluir Notícia' })
  await userEvent.dblClick(button)
  expect(remove).toHaveBeenCalledTimes(1)
  expect(button).toBeDisabled()
  finish()
  await waitFor(() => expect(button).toBeEnabled())
  expect(toast.success).toHaveBeenCalledWith('Registro excluído.')
})

it('retains a failed record and allows retry', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const remove = vi.fn().mockRejectedValue(new Error('failure'))
  render(<DeleteRecordButton name="Notícia" onDelete={remove} />)
  const button = screen.getByRole('button', { name: 'Excluir Notícia' })
  await userEvent.click(button)
  await waitFor(() => expect(toast.error).toHaveBeenCalled())
  expect(toast.success).not.toHaveBeenCalled()
  expect(button).toBeEnabled()
})
