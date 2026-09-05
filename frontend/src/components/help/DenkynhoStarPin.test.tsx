// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { DenkynhoStarPin } from './DenkynhoStarPin'

afterEach(cleanup)

it('desenha um broche esmaltado com volume, não um ícone de traço genérico', () => {
  const { container } = render(<DenkynhoStarPin />)
  const pin = container.querySelector('[data-cosmetic="star-pin"]')
  expect(pin?.getAttribute('aria-hidden')).toBe('true')
  expect(pin?.querySelector('linearGradient')).toBeTruthy()
  expect(pin?.querySelectorAll('path').length).toBeGreaterThanOrEqual(2)
  expect(pin?.querySelector('circle')).toBeTruthy()
})
