import { afterEach, describe, expect, it, vi } from 'vitest'
import { request, resetHttpClient } from './http'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('request session recovery', () => {
  afterEach(() => {
    resetHttpClient()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('retries a GET after a 502', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('bad gateway', { status: 502 }))
      .mockResolvedValueOnce(jsonResponse({ username: 'hero' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request<{ username: string }>('/shared/me/')).resolves.toEqual({ username: 'hero' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('refreshes cookies after 401 and retries the original request', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/shared/me/') && fetchMock.mock.calls.length === 1) {
        return jsonResponse({ message: 'expired' }, 401)
      }
      if (url.endsWith('/auth/csrf/')) return jsonResponse({ csrfToken: 'token' })
      if (url.endsWith('/auth/refresh/')) return jsonResponse({ ok: true })
      if (url.endsWith('/shared/me/')) return jsonResponse({ username: 'hero' })
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(request<{ username: string }>('/shared/me/')).resolves.toEqual({ username: 'hero' })
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.some((url) => url.endsWith('/auth/refresh/'))).toBe(true)
  })
})
