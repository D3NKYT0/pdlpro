// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SLOT_SYMBOLS } from './gameArt'
import { SlotMark } from './slotSymbols'

it('desenha um svg próprio para cada símbolo do caça-níquel', () => {
  const { container } = render(
    <>
      {SLOT_SYMBOLS.map((symbol) => (
        <SlotMark key={symbol} symbol={symbol} />
      ))}
    </>,
  )
  expect(container.querySelectorAll('[data-slot-mark]')).toHaveLength(SLOT_SYMBOLS.length)
  for (const symbol of SLOT_SYMBOLS) {
    expect(container.querySelector(`[data-slot-mark="${symbol}"]`)).toBeTruthy()
  }
})
