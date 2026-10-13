import { expect, it } from 'vitest'
import { authReturnPath } from './auth-return'

it.each([null, 'https://example.com', '//example.com', '/\\example.com', '/panel\n'])('rejects unsafe return path %s', value => {
  expect(authReturnPath(value)).toBe('/panel')
})
it('preserves internal application destinations', () => {
  expect(authReturnPath('/panel/supporters')).toBe('/panel/supporters')
})
