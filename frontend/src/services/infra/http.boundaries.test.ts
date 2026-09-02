import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, refreshSession, request, resetHttpClient } from './http'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
const fetchMock = vi.fn()

beforeEach(() => {
  resetHttpClient()
  vi.useFakeTimers()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  resetHttpClient()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('limites de repetição e contrato de erro', () => {
  it.each([408, 425, 429, 500, 502, 503, 504])('limita GET com HTTP %i a três tentativas', async status => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ message: 'Indisponível', error_code: 'UPSTREAM' }, status)))
    const result = request('/public/server/').catch(error => error)
    await vi.runAllTimersAsync()
    expect(await result).toMatchObject({ status, errorCode: 'UPSTREAM', message: 'Indisponível' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each([400, 403, 404, 409, 422])('não repete erro permanente %i', async status => {
    fetchMock.mockResolvedValue(json({ details: { field: ['inválido'] } }, status))
    await expect(request('/public/server/')).rejects.toMatchObject({ status, details: { field: ['inválido'] } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('não repete %s em falha transitória', async method => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: 'csrf' })).mockResolvedValue(json({}, 503))
    await expect(request('/shared/wallet/transfer/', { method, body: '{}' })).rejects.toMatchObject({ status: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(2) // uma leitura CSRF e uma mutação
  })

  it('normaliza erro de rede e esgota somente três tentativas', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const result = request('/public/server/').catch(error => error)
    await vi.runAllTimersAsync()
    expect(await result).toBeInstanceOf(ApiError)
    expect(await result).toMatchObject({ status: 0, errorCode: 'NETWORK_ERROR' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('aceita resposta 204 sem tentar decodificar JSON', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(request('/public/server/')).resolves.toBeUndefined()
  })

  it('preserva contrato mesmo quando o servidor responde HTML', async () => {
    fetchMock.mockResolvedValue(new Response('<h1>Not found</h1>', { status: 404 }))
    await expect(request('/public/server/')).rejects.toMatchObject({ status: 404, errorCode: 'ERROR', details: {} })
  })
})

describe('cookies, CSRF e renovação de sessão', () => {
  it('reutiliza CSRF e preserva headers enviados pelo chamador', async () => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: 'csrf-token' })).mockImplementation(() => Promise.resolve(json({ ok: true })))
    await request('/write/', { method: 'POST', body: '{}', headers: { 'X-Request-ID': 'trace' } })
    await request('/write/', { method: 'POST', body: '{}' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const options = fetchMock.mock.calls[1][1]
    expect(options.credentials).toBe('include')
    expect(options.headers.get('X-CSRFToken')).toBe('csrf-token')
    expect(options.headers.get('X-Request-ID')).toBe('trace')
    expect(options.headers.get('Content-Type')).toBe('application/json')
  })

  it('deixa o navegador definir o boundary de multipart', async () => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: 'csrf' })).mockResolvedValue(json({}))
    const body = new FormData()
    body.append('name', 'Avatar')
    await request('/shared/me/', { method: 'PATCH', body })
    const options = fetchMock.mock.calls[1][1]
    expect(options.body).toBe(body)
    expect(options.headers.has('Content-Type')).toBe(false)
  })

  it('compartilha uma única renovação entre chamadas simultâneas', async () => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: 'csrf' })).mockResolvedValue(json({}))
    expect(await Promise.all([refreshSession(), refreshSession(), refreshSession()])).toEqual([true, true, true])
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh/'))).toHaveLength(1)
  })

  it('não entra em loop quando a requisição continua sem autorização', async () => {
    fetchMock.mockImplementation((url: string) => Promise.resolve(url.endsWith('/auth/csrf/') ? json({ csrfToken: 'x' }) : url.endsWith('/auth/refresh/') ? json({}) : json({}, 401)))
    await expect(request('/shared/me/')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/shared/me/'))).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh/'))).toHaveLength(1)
  })

  it('login inválido não tenta renovar a sessão', async () => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: 'x' })).mockResolvedValue(json({}, 401))
    await expect(request('/auth/login/', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 401 })
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/auth/refresh/'))).toBe(false)
  })

  it('renovação indisponível informa falha sem lançar exceção', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    await expect(refreshSession()).resolves.toBe(false)
  })
})
