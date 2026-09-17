// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('só publica o valor depois do atraso e cancela teclas intermediárias', () => {
  vi.useFakeTimers()
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
    initialProps: { value: '' },
  })
  expect(result.current).toBe('')
  rerender({ value: 's' })
  rerender({ value: 'sw' })
  rerender({ value: 'sword' })
  act(() => { vi.advanceTimersByTime(299) })
  expect(result.current).toBe('')
  act(() => { vi.advanceTimersByTime(1) })
  expect(result.current).toBe('sword')
})
