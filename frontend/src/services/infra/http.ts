export class ApiError extends Error {
  status: number
  errorCode: string
  details: Record<string, unknown>

  constructor(message: string, status: number, errorCode: string, details: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.errorCode = errorCode
    this.details = details
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

const BASE = '/api/v1'
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])
let csrfToken: string | null = null
let refreshPromise: Promise<boolean> | null = null

async function readCsrf(): Promise<string | null> {
  if (csrfToken) return csrfToken
  const response = await fetch(`${BASE}/auth/csrf/`, { credentials: 'include' })
  if (!response.ok) return null
  const data = await response.json()
  csrfToken = data.csrfToken ?? null
  return csrfToken
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!SAFE.has(method)) {
    const csrf = await readCsrf()
    if (csrf) headers.set('X-CSRFToken', csrf)
  }

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession()
    if (refreshed) return request<T>(path, init)
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
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((response) => response.ok)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}
