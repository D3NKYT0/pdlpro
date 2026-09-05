// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { DenkynhoActivityIcon } from './DenkynhoActivityIcon'

afterEach(cleanup)

it.each(['feed', 'sleep', 'play', 'bath', 'walk', 'dance'] as const)('renderiza o SVG detalhado e decorativo de %s', action => {
  const { container } = render(<DenkynhoActivityIcon action={action} />)
  const icon = container.querySelector(`[data-activity-icon="${action}"]`)
  expect(icon?.getAttribute('aria-hidden')).toBe('true')
  expect(icon?.getAttribute('width')).toBe('44')
  expect(icon?.getAttribute('height')).toBe('44')
  expect(icon?.querySelectorAll('path, circle').length).toBeGreaterThanOrEqual(4)
})
