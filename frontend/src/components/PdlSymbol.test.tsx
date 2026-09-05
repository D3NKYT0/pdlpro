// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PdlHeroEmblem, PdlSymbol } from './PdlSymbol'

vi.mock('../theme/assets', () => ({ themeImage: (path: string) => `/theme/default/images/${path}` }))

it('renderiza o emblema vetorial como marca decorativa e não como texto', () => {
  const { container } = render(<PdlSymbol className="brand-mark" />)
  const mark = container.querySelector('img')

  expect(mark).toHaveAttribute('src', '/theme/default/images/pdl-symbol.svg')
  expect(mark).toHaveAttribute('alt', '')
  expect(mark).toHaveAttribute('aria-hidden', 'true')
  expect(mark).toHaveAttribute('draggable', 'false')
  expect(mark).toHaveClass('brand-mark')
})

it('separa o emblema imóvel das órbitas decorativas sem sobrepor um nome', () => {
  const { container } = render(<PdlHeroEmblem className="hero-mark" />)

  expect(container.querySelectorAll('.pdl-emblem-orbit')).toHaveLength(2)
  expect(container.querySelector('.pdl-emblem-symbol')).toHaveAttribute('src', '/theme/default/images/pdl-symbol.svg')
  expect(container.querySelectorAll('img')).toHaveLength(1)
  expect(container).not.toHaveTextContent('Lineage')
})
