// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { CookieConsentProvider, useCookieConsent } from '../../contexts/CookieConsentContext'
import { ConsentEnforcementBridge } from './ConsentEnforcementBridge'
import { updateTrackingConsent } from '../../lib/tracking'
import { initializeMonitoring, shutdownMonitoring } from '../../observability'

vi.mock('../../lib/tracking', () => ({ updateTrackingConsent: vi.fn() }))
vi.mock('../../observability', () => ({ initializeMonitoring: vi.fn().mockResolvedValue({}), shutdownMonitoring: vi.fn() }))

function Controls() {
  const consent = useCookieConsent()
  return <><button onClick={consent.acceptAll}>accept</button><button onClick={consent.reset}>reset</button><button onClick={consent.rejectOptional}>reject</button><button onClick={() => consent.savePreferences({ functional: true, analytics: true, marketing: false })}>custom</button></>
}
function mount() {
  render(<CookieConsentProvider><ConsentEnforcementBridge /><Controls /></CookieConsentProvider>)
  return userEvent.setup()
}
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks() })

it('revokes trackers immediately when an accepted preference is reset', async () => {
  const user = mount()
  await user.click(screen.getByText('accept'))
  expect(updateTrackingConsent).toHaveBeenLastCalledWith({ analytics: true, marketing: true })
  await user.click(screen.getByText('reset'))
  expect(updateTrackingConsent).toHaveBeenLastCalledWith({ analytics: false, marketing: false })
  expect(shutdownMonitoring).toHaveBeenCalled()
})
it('revokes trackers when another tab removes or clears preferences', async () => {
  const user = mount()
  await user.click(screen.getByText('accept'))
  localStorage.clear()
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })))
  expect(updateTrackingConsent).toHaveBeenLastCalledWith({ analytics: false, marketing: false })
})
it('communicates initial denial, rejection and independent category choices', async () => {
  const user = mount()
  expect(updateTrackingConsent).toHaveBeenLastCalledWith({ analytics: false, marketing: false })
  await user.click(screen.getByText('custom'))
  expect(updateTrackingConsent).toHaveBeenLastCalledWith({ analytics: true, marketing: false })
  await user.click(screen.getByText('reject'))
  expect(updateTrackingConsent).toHaveBeenLastCalledWith({ analytics: false, marketing: false })
})
it('shuts down monitoring if permission is revoked while initialization is pending', async () => {
  let finish!: (value: never) => void
  vi.mocked(initializeMonitoring).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const user = mount()
  await user.click(screen.getByText('accept'))
  await user.click(screen.getByText('reset'))
  await act(async () => { finish({} as never) })
  expect(shutdownMonitoring).toHaveBeenCalled()
})
