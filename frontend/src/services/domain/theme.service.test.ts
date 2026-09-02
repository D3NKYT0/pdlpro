import { beforeEach, expect, it, vi } from 'vitest'
import { request } from '../infra/http'
import { themeApi, type ApiTheme } from './theme.service'

vi.mock('../infra/http', () => ({ request: vi.fn() }))
const send = vi.mocked(request)

const custom: ApiTheme = {
  id: 'valorem', package_id: 'package-id', name: 'Valorem', version: '1.0.0', author: 'PDL',
  description: '', active: false, builtin: false, base_url: '/media/themes/valorem/',
  stylesheet_url: '/media/themes/valorem/theme.css', assets: {},
}

beforeEach(() => send.mockReset())

it('usa os contratos públicos e administrativos de temas', async () => {
  send.mockResolvedValue(undefined as never)
  const file = new File(['zip'], 'valorem.zip', { type: 'application/zip' })
  await themeApi.active()
  await themeApi.list()
  await themeApi.install(file)
  await themeApi.activate(custom)
  await themeApi.activate({ ...custom, id: 'default', package_id: null, builtin: true })
  await themeApi.remove(custom)

  expect(send.mock.calls[0]).toEqual(['/public/theme/'])
  expect(send.mock.calls[1]).toEqual(['/staff/themes/'])
  expect(send.mock.calls[2]?.[0]).toBe('/staff/themes/')
  expect(send.mock.calls[2]?.[1]).toMatchObject({ method: 'POST' })
  expect(send.mock.calls[2]?.[1]?.body).toBeInstanceOf(FormData)
  expect(send.mock.calls[3]).toEqual(['/staff/themes/package-id/activate/', { method: 'POST', body: '{}' }])
  expect(send.mock.calls[4]).toEqual(['/staff/themes/default/activate/', { method: 'POST', body: '{}' }])
  expect(send.mock.calls[5]).toEqual(['/staff/themes/package-id/', { method: 'DELETE' }])
})
