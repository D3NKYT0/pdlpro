import { describe, expect, it } from 'vitest'
import { fromDatetimeLocal, toDatetimeLocal } from './datetime'

describe('datetime local helpers', () => {
  it('round-trips a valid instant', () => {
    const iso = fromDatetimeLocal('2027-01-03T18:00')
    expect(iso).toMatch(/^2027-01-03T/)
    expect(toDatetimeLocal(iso)).toBe('2027-01-03T18:00')
  })

  it('returns empty values for missing input', () => {
    expect(toDatetimeLocal(null)).toBe('')
    expect(fromDatetimeLocal('')).toBeNull()
  })
})
