import { isApiError } from './http'
import type { ApiUser } from '../types'

const TRANSIENT_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504])

export function isTransientError(error: unknown): boolean {
  if (!isApiError(error)) return true
  return TRANSIENT_STATUS.has(error.status)
}

export async function restoreSession(
  loadMe: () => Promise<ApiUser>,
  delaysMs: number[] = [400, 1000, 2000, 4000, 8000],
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<{ user: ApiUser | null; retry: boolean }> {
  try {
    return { user: await loadMe(), retry: false }
  } catch (error) {
    if (!isTransientError(error)) return { user: null, retry: false }
  }

  for (const wait of delaysMs) {
    await sleep(wait)
    try {
      return { user: await loadMe(), retry: false }
    } catch (error) {
      if (!isTransientError(error)) return { user: null, retry: false }
    }
  }

  return { user: null, retry: true }
}
