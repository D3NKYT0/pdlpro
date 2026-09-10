// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../i18n'
import { TermsReacceptanceGate } from './TermsReacceptanceGate'

const acceptTerms = vi.fn()
const refreshUser = vi.fn()
const logout = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    logout,
    refreshUser,
    user: {
      id: '1',
      username: 'hero',
      email: 'hero@test.dev',
      display_name: 'Hero',
      bio: '',
      role: 'player',
      is_email_verified: true,
      fichas: 0,
      avatar_url: null,
      needs_terms_acceptance: true,
      terms_accepted_at: '2026-01-01T00:00:00Z',
      current_legal_docs_version: '2026-09-10',
    },
  }),
}))

vi.mock('../../services/api', () => ({
  authApi: {
    acceptTerms: (...args: unknown[]) => acceptTerms(...args),
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('bloqueia o painel até aceitar a nova versão dos documentos', async () => {
  acceptTerms.mockResolvedValue({})
  refreshUser.mockResolvedValue(undefined)
  const user = userEvent.setup()
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <TermsReacceptanceGate />
      </MemoryRouter>
    </I18nextProvider>,
  )

  expect(screen.getByRole('dialog', { name: /documentos legais/i })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /aceitar e continuar/i }))
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(acceptTerms).not.toHaveBeenCalled()

  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: /aceitar e continuar/i }))
  expect(acceptTerms).toHaveBeenCalledWith({ terms_accepted: true })
  expect(refreshUser).toHaveBeenCalled()
})
