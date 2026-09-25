// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import { AdminIntegrationsPage } from './AdminIntegrationsPage'
import { staffApi } from '../../services/api'

vi.mock('../../services/domain/staff.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/domain/staff.service')>()
  return {
    ...actual,
    staffApi: {
      ...actual.staffApi,
      integrationsStatus: vi.fn(),
      saveIntegrationSection: vi.fn(),
      testIntegrationSection: vi.fn(),
    },
  }
})

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'ops', is_superuser: true, email: 'ops@pdl.dev' } }),
}))

const statusFixture = {
  revision: 1,
  payments: {
    section: 'payments',
    updated_at: null,
    fields: [
      { key: 'STRIPE_SECRET_KEY', configured: true, fingerprint: 'abc123def456', value: null, masked: '' },
      { key: 'STRIPE_PUBLISHABLE_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'STRIPE_WEBHOOK_SECRET', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'STRIPE_ACTIVATE_PAYMENTS', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'MERCADO_PAGO_ACCESS_TOKEN', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'MERCADO_PAGO_PUBLIC_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'MERCADO_PAGO_WEBHOOK_SECRET', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'MERCADO_PAGO_ACTIVATE_PAYMENTS', configured: true, fingerprint: '', value: false, masked: '' },
    ],
  },
  lineage: {
    section: 'lineage',
    updated_at: null,
    fields: [
      { key: 'LINEAGE_DB_ENABLED', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'LINEAGE_DB_HOST', configured: true, fingerprint: '', value: '127.0.0.1', masked: '' },
      { key: 'LINEAGE_DB_PORT', configured: true, fingerprint: '', value: 3306, masked: '' },
      { key: 'LINEAGE_DB_NAME', configured: true, fingerprint: '', value: 'l2jdb', masked: '' },
      { key: 'LINEAGE_DB_USER', configured: true, fingerprint: '', value: 'l2user', masked: '' },
      { key: 'LINEAGE_DB_PASSWORD', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'LINEAGE_DB_SSL', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'LINEAGE_DB_SSL_VERIFY', configured: true, fingerprint: '', value: true, masked: '' },
      { key: 'LINEAGE_DB_SSL_CA', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'LINEAGE_DB_SSL_CERT', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'LINEAGE_DB_SSL_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'LINEAGE_QUERY_MODULE', configured: true, fingerprint: '', value: 'lucerav2', masked: '' },
      { key: 'LINEAGE_PASSWORD_ALGO', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'LINEAGE_DB_POOL_SIZE', configured: true, fingerprint: '', value: 2, masked: '' },
      { key: 'LINEAGE_DB_MAX_OVERFLOW', configured: true, fingerprint: '', value: 4, masked: '' },
      { key: 'GAME_SERVER_IP', configured: true, fingerprint: '', value: '127.0.0.1', masked: '' },
      { key: 'GAME_SERVER_PORT', configured: true, fingerprint: '', value: 7777, masked: '' },
      { key: 'LOGIN_SERVER_PORT', configured: true, fingerprint: '', value: 2106, masked: '' },
      { key: 'SERVER_STATUS_TIMEOUT', configured: true, fingerprint: '', value: 2, masked: '' },
    ],
  },
  smtp: {
    section: 'smtp',
    updated_at: null,
    fields: [
      {
        key: 'EMAIL_BACKEND',
        configured: true,
        fingerprint: '',
        value: 'django.core.mail.backends.console.EmailBackend',
        masked: '',
      },
      { key: 'EMAIL_HOST', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'EMAIL_PORT', configured: true, fingerprint: '', value: 587, masked: '' },
      { key: 'EMAIL_USE_TLS', configured: true, fingerprint: '', value: true, masked: '' },
      { key: 'EMAIL_USE_SSL', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'EMAIL_HOST_USER', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'EMAIL_HOST_PASSWORD', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'DEFAULT_FROM_EMAIL', configured: true, fingerprint: '', value: 'noreply@localhost', masked: '' },
    ],
  },
  oauth: {
    section: 'oauth',
    updated_at: null,
    fields: [
      { key: 'GOOGLE_CLIENT_ID', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'GOOGLE_CLIENT_SECRET', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'DISCORD_CLIENT_ID', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'DISCORD_CLIENT_SECRET', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'HCAPTCHA_SITE_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'HCAPTCHA_SECRET_KEY', configured: false, fingerprint: '', value: null, masked: '' },
    ],
  },
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, null, createElement(AdminIntegrationsPage)),
    ),
  )
}

describe('AdminIntegrationsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.mocked(staffApi.integrationsStatus).mockResolvedValue(statusFixture as never)
    vi.mocked(staffApi.saveIntegrationSection).mockResolvedValue(statusFixture as never)
    vi.mocked(staffApi.testIntegrationSection).mockResolvedValue({
      ok: true,
      message: 'ok',
      details: {},
    })
  })

  it('mostra abas e mascara segredos configurados', async () => {
    renderPage()
    expect(await screen.findByRole('tab', { name: /pagamentos/i })).toBeInTheDocument()
    expect(screen.getByText(/configurado · abc123def456/i)).toBeInTheDocument()
    expect(screen.queryByDisplayValue('sk_')).toBeNull()
    expect(document.querySelector('[data-enamel-icon="payment-card"]')).not.toBeNull()
    expect(document.querySelector('[data-enamel-icon="purse"]')).not.toBeNull()
    expect(document.querySelector('.admin-integrations-section[data-tone="stripe"]')).not.toBeNull()
  })

  it('salva payload sem reenviar segredo vazio e bloqueia double-submit', async () => {
    const user = userEvent.setup()
    let resolveSave: (value: unknown) => void = () => undefined
    const pending = new Promise((resolve) => {
      resolveSave = resolve
    })
    vi.mocked(staffApi.saveIntegrationSection).mockReturnValue(pending as never)

    renderPage()
    const saveButton = await screen.findByRole('button', { name: /salvar/i })
    await user.click(saveButton)
    await waitFor(() => expect(staffApi.saveIntegrationSection).toHaveBeenCalledTimes(1))
    expect(staffApi.saveIntegrationSection).toHaveBeenCalledWith(
      'payments',
      expect.not.objectContaining({ STRIPE_SECRET_KEY: expect.anything() }),
    )
    await user.click(saveButton)
    expect(staffApi.saveIntegrationSection).toHaveBeenCalledTimes(1)
    resolveSave(statusFixture)
  })

  it('alterna para OAuth e dispara teste', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: /oauth/i }))
    expect(await screen.findByLabelText(/google client id/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /testar/i }))
    await waitFor(() => expect(staffApi.testIntegrationSection).toHaveBeenCalledWith('oauth'))
  })
})
