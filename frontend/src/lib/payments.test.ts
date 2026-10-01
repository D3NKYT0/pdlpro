// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { alternateStripeCurrency, confirmStripePayment, formatDocument, inferDocumentType, loadScript, mountMercadoPagoBrick, resolveInitialCurrency, sanitizeDocument } from './payments'

it('escolhe a outra moeda quando o cartão recusa a cobrança', () => {
  const declined = { decline_code: 'currency_not_supported' as const }
  const brazil = { ...declined, payment_method: { card: { country: 'BR' } } }
  const europe = { ...declined, payment_method: { card: { country: 'DE' } } }
  expect(alternateStripeCurrency(brazil, 'USD')).toBe('BRL')
  expect(alternateStripeCurrency(brazil, 'BRL')).toBeNull()
  expect(alternateStripeCurrency(europe, 'USD')).toBe('BRL')
  expect(alternateStripeCurrency(europe, 'BRL')).toBe('USD')
  expect(alternateStripeCurrency(declined, 'USD')).toBe('BRL')
  expect(alternateStripeCurrency({ decline_code: 'insufficient_funds' }, 'USD')).toBeNull()
  expect(alternateStripeCurrency(undefined, 'BRL')).toBeNull()

  // Testes com catálogo dinâmico de moedas
  const dynamicAvailable = ['BRL', 'USD', 'EUR']
  expect(alternateStripeCurrency(brazil, 'USD', dynamicAvailable, 'BRL')).toBe('BRL')
  expect(alternateStripeCurrency(brazil, 'EUR', dynamicAvailable, 'BRL')).toBe('BRL')
  expect(alternateStripeCurrency(brazil, 'BRL', dynamicAvailable, 'BRL')).toBeNull()
  expect(alternateStripeCurrency(europe, 'USD', dynamicAvailable, 'BRL')).toBe('EUR')
  expect(alternateStripeCurrency(europe, 'EUR', dynamicAvailable, 'BRL')).toBe('USD')
})

it('resolve a moeda inicial respeitando a hierarquia: preferência > país > liquidação', () => {
  const available = ['BRL', 'USD', 'EUR']

  // 1. Preferência salva tem precedência se ativa
  expect(
    resolveInitialCurrency({
      savedCurrency: 'EUR',
      userCountry: 'BR',
      availableCurrencies: available,
    })
  ).toBe('EUR')

  // Preferência salva é ignorada se não estiver ativa no catálogo
  expect(
    resolveInitialCurrency({
      savedCurrency: 'GBP',
      userCountry: 'BR',
      availableCurrencies: available,
    })
  ).toBe('BRL')

  // 2. País da conta do usuário
  expect(
    resolveInitialCurrency({
      userCountry: 'BR',
      availableCurrencies: available,
    })
  ).toBe('BRL')

  expect(
    resolveInitialCurrency({
      userCountry: 'DE',
      availableCurrencies: available,
    })
  ).toBe('EUR')

  // País europeu sem EUR no catálogo cai para USD se disponível
  expect(
    resolveInitialCurrency({
      userCountry: 'DE',
      availableCurrencies: ['BRL', 'USD'],
    })
  ).toBe('USD')

  // Outros países caem para USD se disponível
  expect(
    resolveInitialCurrency({
      userCountry: 'JP',
      availableCurrencies: available,
    })
  ).toBe('USD')

  // 3. Sem país ou país desconhecido sem USD: liquidação
  expect(
    resolveInitialCurrency({
      availableCurrencies: ['BRL'],
      settlementCurrency: 'BRL',
    })
  ).toBe('BRL')

  expect(
    resolveInitialCurrency({
      userCountry: 'JP',
      availableCurrencies: ['EUR', 'BRL'],
      settlementCurrency: 'EUR',
    })
  ).toBe('EUR')
})

afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals() })
it.each([['123.456.789-09', '12345678909'], ['12.345.678/0001-90', '12345678000190'], ['x abc', '']])('normaliza documento %s', (value, digits) => {
  expect(sanitizeDocument(value)).toBe(digits)
})
it.each([['12345678909', 'CPF'], ['12345678000190', 'CNPJ'], ['', null], ['1234', null]])('identifica tipo pelo tamanho: %s', (digits, type) => {
  expect(inferDocumentType(digits)).toBe(type)
})
it.each([
  ['10505627477', '105.056.274-77'],
  ['12345678000190', '12.345.678/0001-90'],
  ['123', '123'],
  ['', ''],
])('formata documento %s em %s', (raw, expected) => {
  expect(formatDocument(raw)).toBe(expected)
})

it('compartilha tag de script entre carregamentos simultâneos', async () => {
  const src = 'https://sdk.example.test/test.js'
  const first = loadScript(src)
  const second = loadScript(src)
  expect(document.querySelectorAll('script')).toHaveLength(1)
  document.querySelector('script')!.dispatchEvent(new Event('load'))
  await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined])
})

it('propaga falha de carregamento de SDK', async () => {
  const pending = loadScript('https://sdk.example.test/test.js')
  const assertion = expect(pending).rejects.toThrow('Falha ao carregar SDK')
  document.querySelector('script')!.dispatchEvent(new Event('error'))
  await assertion
})

it('monta Stripe, confirma sem redirecionamento obrigatório e desmonta', async () => {
  const element = { mount: vi.fn(), unmount: vi.fn() }
  const elements = { getElement: vi.fn().mockReturnValue(null), create: vi.fn().mockReturnValue(element) }
  const stripe = { elements: vi.fn().mockReturnValue(elements), confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { status: 'succeeded' } }) }
  vi.stubGlobal('Stripe', vi.fn().mockReturnValue(stripe))
  const tag = document.createElement('script'); tag.src = 'https://js.stripe.com/v3/'; document.body.appendChild(tag)
  const session = await confirmStripePayment({ publicKey: 'pk-test', clientSecret: 'secret', containerId: 'checkout' })
  expect(element.mount).toHaveBeenCalledWith('#checkout')
  expect(await session.confirm()).toEqual({ paymentIntent: { status: 'succeeded' } })
  expect(stripe.confirmPayment).toHaveBeenCalledWith({ elements, confirmParams: { return_url: window.location.href }, redirect: 'if_required' })
  session.unmount()
  expect(element.unmount).toHaveBeenCalledOnce()
})

it('monta Mercado Pago com documento normalizado e encaminha callbacks', async () => {
  const create = vi.fn().mockResolvedValue({ unmount: vi.fn() })
  vi.stubGlobal('MercadoPago', class { bricks() { return { create } } })
  const tag = document.createElement('script'); tag.src = 'https://sdk.mercadopago.com/js/v2'; document.body.appendChild(tag)
  const onSubmit = vi.fn().mockResolvedValue(undefined), onReady = vi.fn(), onError = vi.fn()
  await mountMercadoPagoBrick({ publicKey: 'pk-test', amount: 25, email: 'a@test.dev', firstName: 'John', lastName: 'Doe', document: '123.456.789-09', containerId: 'checkout', onSubmit, onReady, onError })
  const config = create.mock.calls[0][2]
  expect(config.initialization.payer.identification).toEqual({ type: 'CPF', number: '12345678909' })
  await config.callbacks.onSubmit({ formData: { token: 'opaque' } })
  expect(onSubmit).toHaveBeenCalledWith({
    token: 'opaque',
    payer: {
      email: 'a@test.dev',
      first_name: 'John',
      last_name: 'Doe',
      identification: { type: 'CPF', number: '12345678909' },
    },
  })
  config.callbacks.onReady()
  expect(onReady).toHaveBeenCalledOnce()
  config.callbacks.onError({ message: 'Recusado' })
  expect(onError).toHaveBeenCalledWith('Recusado')
})

it('monta Mercado Pago respeitando paymentOptions restritas (ex.: apenas PIX)', async () => {
  const create = vi.fn().mockResolvedValue({ unmount: vi.fn() })
  vi.stubGlobal('MercadoPago', class { bricks() { return { create } } })
  const tag = document.createElement('script')
  tag.src = 'https://sdk.mercadopago.com/js/v2'
  document.body.appendChild(tag)
  const onSubmit = vi.fn().mockResolvedValue(undefined), onReady = vi.fn(), onError = vi.fn()

  // Case 1: Only PIX
  await mountMercadoPagoBrick({
    publicKey: 'pk-test',
    amount: 50,
    email: 'pix@test.dev',
    document: '123.456.789-09',
    containerId: 'checkout-pix',
    paymentOptions: { pix: true, boleto: false, credit_card: false, debit_card: false },
    onSubmit,
    onReady,
    onError,
  })
  const pixConfig = create.mock.calls[0][2]
  expect(pixConfig.customization.paymentMethods).toEqual({ bankTransfer: 'all' })

  // Case 2: Only Boleto
  await mountMercadoPagoBrick({
    publicKey: 'pk-test',
    amount: 100,
    email: 'boleto@test.dev',
    document: '123.456.789-09',
    containerId: 'checkout-boleto',
    paymentOptions: { pix: false, boleto: true, credit_card: false, debit_card: false },
    onSubmit,
    onReady,
    onError,
  })
  const boletoConfig = create.mock.calls[1][2]
  expect(boletoConfig.customization.paymentMethods).toEqual({ ticket: 'all' })
})

