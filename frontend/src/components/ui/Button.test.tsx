// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Button } from './Button'

it('aplica a variante amarela sem reusar o âmbar de alerta', () => {
  render(<Button variant="yellow">Destacar</Button>)
  const button = screen.getByRole('button', { name: 'Destacar' })
  expect(button).toHaveClass('ui-button--yellow')
  expect(button).not.toHaveClass('ui-button--warning')
})
