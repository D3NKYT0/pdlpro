export class ApiError extends Error {
  status: number
  errorCode: string
  details: Record<string, unknown>
  requestId: string | null

  constructor(
    message: string,
    status: number,
    errorCode: string,
    details: Record<string, unknown> = {},
    requestId: string | null = null,
  ) {
    super(message)
    this.status = status
    this.errorCode = errorCode
    this.details = details
    this.requestId = requestId
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

type RequestOptions = RequestInit & { authRetry?: boolean }

const BASE = '/api/v1'
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])
const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504])
let csrfToken: string | null = null
let refreshPromise: Promise<boolean> | null = null

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function send(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.', 0, 'NETWORK_ERROR')
  }
}

async function readCsrf(): Promise<string | null> {
  if (csrfToken) return csrfToken
  try {
    const response = await send(`${BASE}/auth/csrf/`, { credentials: 'include' })
    if (!response.ok) return null
    const data = await response.json()
    csrfToken = data.csrfToken ?? null
    return csrfToken
  } catch {
    return null
  }
}

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { authRetry = false, ...rest } = init
  const method = (rest.method || 'GET').toUpperCase()
  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')
  if (rest.body && !(rest.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!SAFE.has(method)) {
    const csrf = await readCsrf()
    if (csrf) headers.set('X-CSRFToken', csrf)
  }

  const attempts = SAFE.has(method) ? 3 : 1
  let response: Response | undefined

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      response = await send(`${BASE}${path}`, {
        ...rest,
        headers,
        credentials: 'include',
      })
    } catch (error) {
      if (attempt < attempts && error instanceof ApiError && error.status === 0) {
        await delay(250 * attempt)
        continue
      }
      throw error
    }

    if (attempt < attempts && TRANSIENT_HTTP.has(response.status)) {
      await delay(250 * attempt)
      continue
    }
    break
  }

  if (!response) {
    throw new ApiError('Não foi possível conectar ao servidor.', 0, 'NETWORK_ERROR')
  }

  if (response.status === 401 && !path.startsWith('/auth/') && !authRetry) {
    const refreshed = await refreshSession()
    if (refreshed) return request<T>(path, { ...init, authRetry: true })
  }

  if (!response.ok) {
    let payload: any = {}
    try {
      payload = await response.json()
    } catch {
      payload = {}
    }
    throw new ApiError(
      payload.message || 'Não foi possível processar a solicitação.',
      response.status,
      payload.error_code || 'ERROR',
      payload.details || {},
      payload.request_id || response.headers.get('X-Request-ID'),
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const headers = new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      })
      const csrf = await readCsrf()
      if (csrf) headers.set('X-CSRFToken', csrf)
      try {
        const response = await send(`${BASE}/auth/refresh/`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: '{}',
        })
        if (response.ok) csrfToken = null
        return response.ok
      } catch {
        return false
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export function resetHttpClient() {
  csrfToken = null
  refreshPromise = null
}
