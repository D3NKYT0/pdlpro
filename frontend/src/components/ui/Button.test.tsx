// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Button } from './Button'

it('mostra o cursor de proibido quando está desativado', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ui.css'), 'utf8')
  expect(css).toMatch(/\.ui-button:disabled[\s\S]*?cursor:\s*not-allowed/)
  expect(css).toMatch(/html\.pdl-panel \.btn\.ui-button:disabled[\s\S]*?cursor:\s*not-allowed/)
  render(<Button disabled>Lutar</Button>)
  expect(screen.getByRole('button', { name: 'Lutar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Lutar' })).toHaveClass('ui-button', 'btn')
})

it('aplica a variante amarela sem reusar o âmbar de alerta', () => {
  render(<Button variant="yellow">Destacar</Button>)
  const button = screen.getByRole('button', { name: 'Destacar' })
  expect(button).toHaveClass('ui-button--yellow')
  expect(button).not.toHaveClass('ui-button--warning')
})
