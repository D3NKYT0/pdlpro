// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SLOT_SYMBOLS } from './gameArt'
import { SlotMark } from './slotSymbols'

it('desenha um svg esmaltado para cada símbolo do caça-níquel', () => {
  const { container } = render(
    <>
      {SLOT_SYMBOLS.map((symbol) => (
        <SlotMark key={symbol} symbol={symbol} />
      ))}
    </>,
  )
  const marks = Array.from(container.querySelectorAll<SVGSVGElement>('[data-slot-mark]'))
  expect(marks.map((mark) => mark.dataset.slotMark)).toEqual([...SLOT_SYMBOLS])
  marks.forEach((mark) => {
    expect(mark).toHaveAttribute('viewBox', '0 0 64 64')
    expect(mark.classList.contains('enamel-glyph')).toBe(true)
    expect(mark.classList.contains('achievement-glyph')).toBe(true)
    expect(mark.classList.contains('chance-slot-mark')).toBe(true)
    expect(mark.querySelector('linearGradient')).not.toBeNull()
  })
})

it('gera IDs de degradê distintos quando o mesmo símbolo se repete', () => {
  const { container } = render(
    <>
      <SlotMark symbol="sword" />
      <SlotMark symbol="sword" />
    </>,
  )
  const ids = Array.from(container.querySelectorAll('linearGradient')).map((node) => node.id)
  expect(ids.length).toBeGreaterThan(1)
  expect(new Set(ids).size).toBe(ids.length)
})
