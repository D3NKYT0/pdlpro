// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Button } from './Button'

afterEach(cleanup)

it('mostra o cursor de proibido quando está desativado', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ui.css'), 'utf8')
  expect(css).toMatch(/\.ui-button:disabled[\s\S]*?cursor:\s*not-allowed/)
  expect(css).toMatch(/html\.pdl-panel \.btn\.ui-button:disabled[\s\S]*?cursor:\s*not-allowed/)
  render(<Button disabled>Lutar</Button>)
  expect(screen.getByRole('button', { name: 'Lutar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Lutar' })).toHaveClass('ui-button', 'btn')
})

it('aplica a variante cinza sem reusar o perigo', () => {
  render(<Button variant="muted" disabled>Lutar</Button>)
  const button = screen.getByRole('button', { name: 'Lutar' })
  expect(button).toHaveClass('ui-button--muted')
  expect(button).not.toHaveClass('ui-button--danger')
  expect(button).not.toHaveClass('ui-button--yellow')
  expect(button).toBeDisabled()
})

it('aplica a variante amarela sem reusar o âmbar de alerta', () => {
  render(<Button variant="yellow">Destacar</Button>)
  const button = screen.getByRole('button', { name: 'Destacar' })
  expect(button).toHaveClass('ui-button--yellow')
  expect(button).not.toHaveClass('ui-button--warning')
})

it('aplica a variante laranja com sua classe correspondente', () => {
  render(<Button variant="orange">Gerenciar</Button>)
  const button = screen.getByRole('button', { name: 'Gerenciar' })
  expect(button).toHaveClass('ui-button--orange')
  expect(button).not.toHaveClass('ui-button--warning')
  expect(button).not.toHaveClass('ghost')
})


it('oferece ajuda contextual por teclado e respeita disabled sem enviar o formulário', async () => {
  const user = userEvent.setup()
  const open = vi.fn()
  const submit = vi.fn(event => event.preventDefault())
  const view = render(<form onSubmit={submit}><Button variant="help" size="sm" aria-label="Ajuda sobre o campo" onClick={open}>?</Button></form>)
  const button = screen.getByRole('button', { name: 'Ajuda sobre o campo' })
  expect(button).toHaveClass('ui-button--help')
  expect(button).not.toHaveClass('btn')
  await user.tab()
  expect(button).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(open).toHaveBeenCalledTimes(1)
  expect(submit).not.toHaveBeenCalled()
  view.rerender(<Button variant="help" aria-label="Ajuda sobre o campo" disabled onClick={open}>?</Button>)
  await user.click(screen.getByRole('button', { name: 'Ajuda sobre o campo' }))
  expect(open).toHaveBeenCalledTimes(1)
})
