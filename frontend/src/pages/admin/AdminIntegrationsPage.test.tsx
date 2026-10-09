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
      chargeCurrencies: vi.fn(),
      saveChargeCurrency: vi.fn(),
      deleteChargeCurrency: vi.fn(),
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
      { key: 'STRIPE_CHECKOUT_MODE', configured: true, fingerprint: '', value: 'embedded', masked: '' },
      { key: 'MERCADO_PAGO_CHECKOUT_MODE', configured: true, fingerprint: '', value: 'embedded', masked: '' },
      { key: 'WALLET_COIN_NAME', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'WALLET_DISPLAY_NAME', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'STRIPE_PAYMENT_DESCRIPTION', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'MERCADO_PAGO_PAYMENT_DESCRIPTION', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'MERCADO_PAGO_STATEMENT_DESCRIPTOR', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'STRIPE_SECRET_KEY', configured: true, fingerprint: 'abc123def456', value: null, masked: '' },
      { key: 'STRIPE_PUBLISHABLE_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'STRIPE_WEBHOOK_SECRET', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'STRIPE_ACTIVATE_PAYMENTS', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'MERCADO_PAGO_ACCESS_TOKEN', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'MERCADO_PAGO_PUBLIC_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'MERCADO_PAGO_WEBHOOK_SECRET', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'MERCADO_PAGO_ACTIVATE_PAYMENTS', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'MERCADO_PAGO_ENABLE_PIX', configured: true, fingerprint: '', value: true, masked: '' },
      { key: 'MERCADO_PAGO_ENABLE_BOLETO', configured: true, fingerprint: '', value: true, masked: '' },
      { key: 'MERCADO_PAGO_ENABLE_CREDIT_CARD', configured: true, fingerprint: '', value: true, masked: '' },
      { key: 'MERCADO_PAGO_ENABLE_DEBIT_CARD', configured: true, fingerprint: '', value: true, masked: '' },
      { key: 'PAYMENT_METHODS', configured: true, fingerprint: '', value: ['mercadopago', 'stripe'], masked: '' },
      { key: 'PAYMENT_BRL_METHOD_PRIORITY', configured: true, fingerprint: '', value: 'user_choice', masked: '' },
      { key: 'PAYMENT_WEBHOOK_BASE_URL', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'COINS_PER_USD', configured: true, fingerprint: '', value: '5.00', masked: '' },
      { key: 'STRIPE_PRESENTMENT_CURRENCIES', configured: true, fingerprint: '', value: 'BRL, USD', masked: '' },
      { key: 'PAYMENT_ALLOW_MOCK', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'PAYMENT_REUSE_HOURS', configured: true, fingerprint: '', value: 2, masked: '' },
    ],
  },
  lineage: {
    section: 'lineage',
    updated_at: null,
    fields: [
      { key: 'LINEAGE_ALLOW_ONLINE_DELIVERY', configured: true, fingerprint: '', value: false, masked: '' },
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
      { key: 'FAKE_PLAYERS_FACTOR', configured: true, fingerprint: '', value: 1, masked: '' },
      { key: 'FAKE_PLAYERS_MIN', configured: true, fingerprint: '', value: 0, masked: '' },
      { key: 'FAKE_PLAYERS_MAX', configured: true, fingerprint: '', value: 0, masked: '' },
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
      { key: 'VAPID_PUBLIC_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'VAPID_PRIVATE_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'VAPID_SUBJECT', configured: true, fingerprint: '', value: 'mailto:noreply@localhost', masked: '' },
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
      { key: 'WEBAUTHN_RP_ID', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'WEBAUTHN_RP_NAME', configured: true, fingerprint: '', value: 'PDL PRO', masked: '' },
      { key: 'WEBAUTHN_ORIGINS', configured: true, fingerprint: '', value: [], masked: '' },
    ],
  },
  denkynho: {
    section: 'denkynho',
    updated_at: null,
    fields: [
      { key: 'DENKYNHO_LLM_ENABLED', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'DENKYNHO_LLM_PROVIDER', configured: true, fingerprint: '', value: 'ollama', masked: '' },
      { key: 'DENKYNHO_OLLAMA_URL', configured: true, fingerprint: '', value: 'http://127.0.0.1:11434', masked: '' },
      { key: 'DENKYNHO_OLLAMA_DOCKER', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'DENKYNHO_LLM_MODEL', configured: true, fingerprint: '', value: 'qwen3.5:4b', masked: '' },
      { key: 'DENKYNHO_LLM_TIMEOUT', configured: true, fingerprint: '', value: 120, masked: '' },
      { key: 'DENKYNHO_LLM_API_URL', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'DENKYNHO_LLM_API_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'DENKYNHO_EMBEDDINGS_ENABLED', configured: true, fingerprint: '', value: true, masked: '' },
      { key: 'DENKYNHO_EMBEDDING_MODEL', configured: true, fingerprint: '', value: 'mini', masked: '' },
    ],
  },
  storage: {
    section: 'storage',
    updated_at: null,
    fields: [
      { key: 'USE_S3', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'AWS_ACCESS_KEY_ID', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'AWS_SECRET_ACCESS_KEY', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'AWS_STORAGE_BUCKET_NAME', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'AWS_S3_REGION_NAME', configured: true, fingerprint: '', value: 'auto', masked: '' },
      { key: 'AWS_S3_ENDPOINT_URL', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'AWS_S3_CUSTOM_DOMAIN', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'AWS_S3_PRIVATE_MEDIA', configured: true, fingerprint: '', value: false, masked: '' },
      { key: 'AWS_QUERYSTRING_EXPIRE', configured: true, fingerprint: '', value: 3600, masked: '' },
      { key: 'AWS_LOCATION', configured: true, fingerprint: '', value: 'media', masked: '' },
    ],
  },
  observability: {
    section: 'observability',
    updated_at: null,
    fields: [
      { key: 'SENTRY_DSN', configured: false, fingerprint: '', value: null, masked: '' },
      { key: 'SENTRY_ENVIRONMENT', configured: true, fingerprint: '', value: 'development', masked: '' },
      { key: 'SENTRY_RELEASE', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'SENTRY_TRACES_SAMPLE_RATE', configured: true, fingerprint: '', value: 0, masked: '' },
    ],
  },
  analytics: {
    section: 'analytics',
    updated_at: null,
    fields: [
      { key: 'VITE_GTAG_ID', configured: true, fingerprint: '', value: 'G-TEST123456', masked: '' },
      { key: 'VITE_GOOGLE_ADS_ID', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'VITE_GOOGLE_ADS_CONVERSION_LABEL', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'VITE_GTM_ID', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'VITE_META_PIXEL_ID', configured: false, fingerprint: '', value: '', masked: '' },
      { key: 'VITE_TIKTOK_PIXEL_ID', configured: false, fingerprint: '', value: '', masked: '' },
    ],
  },
}

function renderPage(
  path = '/panel/admin/integrations',
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return {
    ...render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(MemoryRouter, { initialEntries: [path] }, createElement(AdminIntegrationsPage)),
      ),
    ),
    client,
  }
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
    vi.mocked(staffApi.chargeCurrencies).mockResolvedValue([
      { id: 'curr-1', code: 'BRL', symbol: 'R$', name: 'Real', coins_per_unit: '1.00', is_settlement: true, enabled: true, sort_order: 0 },
      { id: 'curr-2', code: 'USD', symbol: '$', name: 'Dólar', coins_per_unit: '0.20', is_settlement: false, enabled: true, sort_order: 1 },
    ] as never)
  })

  it('edita e salva as descrições dos dois provedores', async () => {
    const user = userEvent.setup()
    renderPage('/panel/admin/integrations?tab=payments')
    const help = await screen.findByRole('button', { name: 'Ajuda sobre variáveis — Stripe' })
    expect(help).toHaveAttribute('aria-expanded', 'false')
    await user.click(help)
    expect(help).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Use \{quantidade\}/, { selector: 'p:not([hidden])' })).toBeVisible()
    await user.click(help)
    expect(help).toHaveAttribute('aria-expanded', 'false')
    const mpHelp = screen.getByRole('button', { name: 'Ajuda sobre variáveis — Mercado Pago' })
    mpHelp.focus()
    await user.keyboard('{Enter}')
    expect(mpHelp).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByPlaceholderText('PDL PRO — {quantidade} moedas')).toHaveValue('')
    expect(screen.getByPlaceholderText('Moedas PDL ({pacote})')).toHaveValue('')
    await user.click(screen.getByRole('combobox', { name: 'Checkout Stripe' }))
    await user.click(screen.getByRole('option', { name: 'No site do provedor (redirecionamento)' }))
    expect(screen.getAllByText(/Aviso legal: no modo integrado/)).toHaveLength(2)
    await user.type(await screen.findByLabelText(/Descrição da cobrança — Stripe/), 'Créditos Stripe')
    await user.type(screen.getByLabelText(/Descrição da cobrança — Mercado Pago/), 'Créditos Pix')
    expect(screen.getByLabelText(/Nome do banco\/carteira/)).toHaveAttribute('maxlength', '80')
    await user.type(screen.getByLabelText(/Nome do banco\/carteira/), 'Banco Cliente A')
    expect(screen.getByLabelText(/Nome da moeda virtual/)).toHaveAttribute('maxlength', '40')
    await user.type(screen.getByLabelText(/Nome da moeda virtual/), 'Blablabla Coin')
    expect(screen.getByLabelText(/Nome na fatura do cartão/)).toHaveAttribute('maxlength', '13')
    await user.type(screen.getByLabelText(/Nome na fatura do cartão/), 'CLIENTE UM')
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(staffApi.saveIntegrationSection).toHaveBeenCalledWith('payments', expect.objectContaining({
      STRIPE_CHECKOUT_MODE: 'redirect', MERCADO_PAGO_CHECKOUT_MODE: 'embedded',
      WALLET_DISPLAY_NAME: 'Banco Cliente A', WALLET_COIN_NAME: 'Blablabla Coin',
      MERCADO_PAGO_STATEMENT_DESCRIPTOR: 'CLIENTE UM',
      STRIPE_PAYMENT_DESCRIPTION: 'Créditos Stripe', MERCADO_PAGO_PAYMENT_DESCRIPTION: 'Créditos Pix',
    })))
  })

  it('salva a política de envio online e bloqueia envios duplicados', async () => {
    const user = userEvent.setup()
    let finish!: (value: never) => void
    vi.mocked(staffApi.saveIntegrationSection).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    renderPage('/panel/admin/integrations?tab=lineage')
    const toggle = await screen.findByRole('checkbox', { name: /permitir envio de moedas e itens/i })
    expect(toggle).not.toBeChecked()
    expect(screen.getByText(/usa a fila items_delayed/i)).toBeInTheDocument()
    await user.click(toggle)
    const save = screen.getByRole('button', { name: /salvar/i })
    await user.dblClick(save)
    expect(staffApi.saveIntegrationSection).toHaveBeenCalledTimes(1)
    expect(staffApi.saveIntegrationSection).toHaveBeenCalledWith('lineage', expect.objectContaining({ LINEAGE_ALLOW_ONLINE_DELIVERY: true }))
    expect(toggle).toBeDisabled()
    finish(statusFixture as never)
    await waitFor(() => expect(toggle).not.toBeDisabled())
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

  it('abre a seção indicada em ?tab= e troca de seção pela URL', async () => {
    const user = userEvent.setup()
    renderPage('/panel/admin/integrations?tab=smtp')
    expect(await screen.findByRole('tab', { name: /smtp/i })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: /pagamentos/i }))
    expect(screen.getByRole('tab', { name: /pagamentos/i })).toHaveAttribute('aria-selected', 'true')
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

  it('mostra a escolha de método BRL só quando Mercado Pago e Stripe estão ativos', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText(/ative mercado pago e stripe ao mesmo tempo/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /método em brl com os dois gateways ativos/i })).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: /ativar mercado pago/i }))
    await user.click(screen.getByRole('checkbox', { name: /ativar stripe/i }))
    await user.click(screen.getByRole('combobox', { name: /método em brl com os dois gateways ativos/i }))
    await user.click(await screen.findByRole('option', { name: /fixar stripe \(cartão\)/i }))
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() =>
      expect(staffApi.saveIntegrationSection).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          MERCADO_PAGO_ACTIVATE_PAYMENTS: true,
          STRIPE_ACTIVATE_PAYMENTS: true,
          PAYMENT_BRL_METHOD_PRIORITY: 'stripe',
        }),
      ),
    )
  })

  it('abre Denkynho e mostra o campo do modelo de IA', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: /denkynho/i }))
    expect(await screen.findByText(/modelo de geração/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('qwen3.5:4b')).toBeInTheDocument()
  })

  it('alterna para OAuth e dispara teste', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: /oauth/i }))
    expect(await screen.findByLabelText(/google client id/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /testar/i }))
    await waitFor(() => expect(staffApi.testIntegrationSection).toHaveBeenCalledWith('oauth'))
  })

  it('alterna para SMTP e exibe select intuitivo de backend com alerta de mock', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: /smtp/i }))
    expect(await screen.findByRole('combobox', { name: /modo de envio/i })).toBeInTheDocument()
    expect(screen.getByText(/atenção: no modo mock/i)).toBeInTheDocument()
    expect(screen.getByText(/console \/ log \(mock/i)).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /modo de envio/i }))
    const smtpRealOption = await screen.findByRole('option', { name: /smtp real/i })
    await user.click(smtpRealOption)
    expect(screen.getByText(/smtp real/i)).toBeInTheDocument()
  })

  it('alterna para Analytics e exibe campos de GA4, Ads, GTM e Pixels', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: /analytics/i }))
    expect(await screen.findByRole('heading', { name: /google analytics 4/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('G-TEST123456')).toBeInTheDocument()
    expect(screen.getByLabelText(/google tag manager/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/meta pixel id/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /testar/i }))
    await waitFor(() => expect(staffApi.testIntegrationSection).toHaveBeenCalledWith('analytics'))
  })

  it('invalida staff-integrations e server-info após salvar com sucesso', async () => {
    const user = userEvent.setup()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    renderPage('/panel/admin/integrations', client)
    const saveButton = await screen.findByRole('button', { name: /salvar/i })
    await user.click(saveButton)

    await waitFor(() => expect(staffApi.saveIntegrationSection).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['staff-integrations'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['server-info'] })
    })
  })

  it('exibe opções de checkout do Mercado Pago (PIX, Boleto, Cartões) e permite alternar', async () => {
    const user = userEvent.setup()
    renderPage('/panel/admin/integrations?tab=payments')

    const pixToggle = await screen.findByRole('checkbox', { name: /habilitar pix/i })
    const boletoToggle = screen.getByRole('checkbox', { name: /habilitar boleto/i })
    const creditToggle = screen.getByRole('checkbox', { name: /habilitar cartão de crédito/i })
    const debitToggle = screen.getByRole('checkbox', { name: /habilitar cartão de débito/i })

    expect(pixToggle).toBeChecked()
    expect(boletoToggle).toBeChecked()
    expect(creditToggle).toBeChecked()
    expect(debitToggle).toBeChecked()

    // Disable boleto
    await user.click(boletoToggle)
    expect(boletoToggle).not.toBeChecked()

    const saveButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(saveButton)

    await waitFor(() =>
      expect(staffApi.saveIntegrationSection).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          MERCADO_PAGO_ENABLE_PIX: true,
          MERCADO_PAGO_ENABLE_BOLETO: false,
        }),
      ),
    )
  })

  it('exibe moedas de cobrança da loja e campo de moedas do Stripe', async () => {
    renderPage('/panel/admin/integrations?tab=payments')

    expect(await screen.findByDisplayValue('BRL, USD')).toBeInTheDocument()
    expect(screen.getByText('Moedas de Cobrança da Loja')).toBeInTheDocument()
    expect(screen.getByText('BRL')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('Liquidação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar moeda/i })).toBeInTheDocument()
  })
})
