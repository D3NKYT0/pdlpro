import { describe, expect, it } from 'vitest'
import { ApiError } from './http'
import { isTransientError, restoreSession } from './session'
import type { ApiUser } from '../types'

const user = { id: '1', username: 'hero' } as ApiUser

describe('isTransientError', () => {
  it('treats network and gateway failures as transient', () => {
    expect(isTransientError(new ApiError('down', 0, 'NETWORK_ERROR'))).toBe(true)
    expect(isTransientError(new ApiError('bad gateway', 502, 'ERROR'))).toBe(true)
    expect(isTransientError(new Error('Failed to fetch'))).toBe(true)
  })

  it('does not retry a real unauthenticated response', () => {
    expect(isTransientError(new ApiError('nope', 401, 'AUTHENTICATION_REQUIRED'))).toBe(false)
    expect(isTransientError(new ApiError('forbidden', 403, 'ERROR'))).toBe(false)
  })
})

describe('restoreSession', () => {
  it('returns the user on the first success', async () => {
    const result = await restoreSession(async () => user, [], async () => undefined)
    expect(result).toEqual({ user, retry: false })
  })

  it('retries after a 502 and restores the session', async () => {
    let calls = 0
    const result = await restoreSession(
      async () => {
        calls += 1
        if (calls === 1) throw new ApiError('bad gateway', 502, 'ERROR')
        return user
      },
      [0],
      async () => undefined,
    )
    expect(calls).toBe(2)
    expect(result).toEqual({ user, retry: false })
  })

  it('stops immediately on 401', async () => {
    let calls = 0
    const result = await restoreSession(
      async () => {
        calls += 1
        throw new ApiError('auth', 401, 'AUTHENTICATION_REQUIRED')
      },
      [0, 0, 0],
      async () => undefined,
    )
    expect(calls).toBe(1)
    expect(result).toEqual({ user: null, retry: false })
  })

  it('asks for background retry when the API stays down', async () => {
    const result = await restoreSession(
      async () => {
        throw new ApiError('down', 0, 'NETWORK_ERROR')
      },
      [0],
      async () => undefined,
    )
    expect(result).toEqual({ user: null, retry: true })
  })
})
