// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SceneBackdrop } from './SceneBackdrop'
import { knownScene } from './scenes'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('waits for artwork, preserves the previous scene on failure and cancels stale loads', () => {
  const requests: { onload: null | (() => void); src: string }[] = []
  vi.stubGlobal('Image', class { onload = null; src = ''; constructor() { requests.push(this) } })
  const { container, rerender, unmount } = render(<SceneBackdrop scene="garden" />)
  expect(container.querySelector('img')).toBeNull()
  act(() => requests[0].onload?.())
  expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/denkynho/scenes/garden.png')
  rerender(<SceneBackdrop scene="study" />)
  const stale = requests[1].onload
  expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/denkynho/scenes/garden.png')
  rerender(<SceneBackdrop scene="camp" />)
  act(() => { requests[2].onload?.(); stale?.() })
  expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/denkynho/scenes/camp.png')
  unmount()
  expect(requests[2].onload).toBeNull()
})
it('accepts only local scene identifiers', () => {
  expect(knownScene('garden')).toBe('garden')
  for (const value of [undefined, '', 'constructor', 'https://example.com/a.png']) expect(knownScene(value)).toBeUndefined()
})
