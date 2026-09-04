// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ActivitySprite } from './ActivitySprite'
import { activitySequences } from './activitySequences'

beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanup(); vi.useRealTimers() })

it.each(Object.keys(activitySequences))('reproduz o ciclo completo de %s com recortes distintos e volta ao início', async pose => {
  const sequence = activitySequences[pose]
  const { container, unmount } = render(<ActivitySprite sequence={sequence} active />)
  const sprite = container.querySelector('svg')!
  const firstView = sprite.getAttribute('viewBox')
  const views = new Set<string | null>()
  for (const tick of sequence.timeline) {
    expect(sprite).toHaveAttribute('data-frame', String(tick.frame))
    expect(sprite.querySelector('image')).toHaveAttribute('href', `/mascot/denkynho/${sequence.src}`)
    expect(sprite.querySelector('rect')).toHaveAttribute('y', tick.frame < 4 ? '0' : String(sequence.split))
    views.add(sprite.getAttribute('viewBox'))
    await act(async () => { await vi.advanceTimersByTimeAsync(tick.duration) })
  }
  expect(views.size).toBe(8)
  expect(sprite).toHaveAttribute('data-frame', '0')
  expect(sprite).toHaveAttribute('viewBox', firstView)
  unmount(); expect(vi.getTimerCount()).toBe(0)
})

it('congela o quadro atual durante a saída e retoma sem duplicar timers', async () => {
  const sequence = activitySequences['12-jogando']
  const { container, rerender, unmount } = render(<ActivitySprite sequence={sequence} active />)
  await act(async () => { await vi.advanceTimersByTimeAsync(350) })
  const view = container.querySelector('svg')!.getAttribute('viewBox')
  rerender(<ActivitySprite sequence={sequence} active={false} />)
  expect(vi.getTimerCount()).toBe(0)
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', view)
  rerender(<ActivitySprite sequence={sequence} active />)
  expect(vi.getTimerCount()).toBe(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(140) })
  expect(container.querySelector('svg')).not.toHaveAttribute('viewBox', view)
  unmount(); expect(vi.getTimerCount()).toBe(0)
})
