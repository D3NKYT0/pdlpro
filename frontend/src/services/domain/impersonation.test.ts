import { afterEach, expect, it, vi } from 'vitest'
import { authApi } from './auth.service'
import { resetHttpClient } from '../infra/http'
afterEach(() => { resetHttpClient(); vi.unstubAllGlobals() })
it('loads role templates and sends a strict versioned delegation over credentialed HTTP', async () => {
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/csrf/') ? { csrfToken: 'csrf' } : {}), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  await authApi.accessRoles()
  await authApi.userAccess('a/b')
  const data = { role: 'partner', additional_roles: ['promoter'], is_staff: false, revision: 'a'.repeat(64) }
  await authApi.updateUserAccess('a/b', data)
  const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
  expect(calls.some(([url]) => url === '/api/v1/auth/access-roles/')).toBe(true)
  const write = calls.find(([url, init]) => url === '/api/v1/auth/site-users/a%2Fb/access/' && init.method === 'PUT')!
  expect(write[1].credentials).toBe('include')
  expect(new Headers(write[1].headers).get('X-CSRFToken')).toBe('csrf')
  expect(JSON.parse(write[1].body as string)).toEqual(data)
})
it('uses credentialed HTTP with CSRF for identity changes and encoded search', async () => {
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/csrf/') ? { csrfToken: 'csrf' } : {}), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  await authApi.siteUsers('a+b@example.com', 2)
  await authApi.startImpersonation('id')
  await authApi.impersonation()
  await authApi.stopImpersonation()
  const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
  expect(calls[0][0]).toBe('/api/v1/auth/site-users/?search=a%2Bb%40example.com&page=2')
  for (const path of ['/api/v1/auth/impersonation/id/', '/api/v1/auth/impersonation/stop/']) {
    const call = calls.find(([url]) => url === path)!
    expect(call[1].method).toBe('POST')
    expect(call[1].credentials).toBe('include')
    expect(new Headers(call[1].headers).get('X-CSRFToken')).toBe('csrf')
  }
  expect(calls.some(([url]) => url === '/api/v1/auth/impersonation/')).toBe(true)
})

it('decodes the explicit status envelope, including no impersonation', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ impersonation: null })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ impersonation: { username: 'admin', target_username: 'hero' } }))))
  await expect(authApi.impersonation()).resolves.toBeNull()
  await expect(authApi.impersonation()).resolves.toEqual({ username: 'admin', target_username: 'hero' })
})
