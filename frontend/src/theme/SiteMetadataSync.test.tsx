// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { serverApi } from '../services/api'
import { SiteMetadataSync } from './SiteMetadataSync'
import { ConsentEnforcementBridge } from '../components/legal/ConsentEnforcementBridge'
import { resetTrackingForTesting, trackPageView } from '../lib/tracking'

vi.mock('../services/api', () => ({ serverApi: { info: vi.fn() } }))
import { CookieConsentProvider, COOKIE_POLICY_VERSION, COOKIE_STORAGE_KEY } from '../contexts/CookieConsentContext'

beforeEach(() => {
  localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify({ version: COOKIE_POLICY_VERSION, decidedAt: '2026-10-03T00:00:00Z', preferences: { essential: true, functional: true, analytics: true, marketing: false } }))
  resetTrackingForTesting()
  document.head.innerHTML = ''
  delete window.dataLayer
  delete window.gtag
  vi.stubEnv('VITE_GTAG_ID', 'G-BUILD-OLD')
})
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetTrackingForTesting()
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  render(<QueryClientProvider client={client}><CookieConsentProvider><ConsentEnforcementBridge /><SiteMetadataSync /></CookieConsentProvider></QueryClientProvider>)
}

it('waits for the authoritative API before loading tags and emits the first view only once', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof serverApi.info>>) => void
  vi.mocked(serverApi.info).mockReturnValue(new Promise(done => { resolve = done }))
  mount()
  trackPageView(window.location.pathname)
  expect(document.getElementById('pdl-gtag-script')).toBeNull()
  expect(window.dataLayer?.filter(item => (item as { event?: string }).event === 'gtm.js' || (item as { event?: string }).event === 'page_view')).toHaveLength(0)
  resolve({ name: 'Review', gtag_id: '', gtm_id: 'GTM-PANEL' } as Awaited<ReturnType<typeof serverApi.info>>)
  await waitFor(() => expect(document.getElementById('pdl-gtm-script')).not.toBeNull())
  expect(document.getElementById('pdl-gtag-script')).toBeNull()
  expect(window.dataLayer?.filter(item => (item as { event?: string }).event === 'page_view')).toHaveLength(1)
})

it('keeps all tracking disabled when the API explicitly clears the build-time ID', async () => {
  vi.mocked(serverApi.info).mockResolvedValue({ name: 'Review', gtag_id: '', gtm_id: '' } as Awaited<ReturnType<typeof serverApi.info>>)
  mount()
  await waitFor(() => expect(document.title).toContain('Review'))
  expect(document.getElementById('pdl-gtag-script')).toBeNull()
  expect(window.dataLayer?.filter(item => (item as { event?: string }).event === 'gtm.js' || (item as { event?: string }).event === 'page_view')).toHaveLength(0)
})

it('uses environment fallback only after the API fails', async () => {
  vi.mocked(serverApi.info).mockRejectedValue(new Error('Unavailable'))
  mount()
  await waitFor(() => expect(document.getElementById('pdl-gtag-script')).not.toBeNull())
  expect((document.getElementById('pdl-gtag-script') as HTMLScriptElement).src).toContain('G-BUILD-OLD')
})
