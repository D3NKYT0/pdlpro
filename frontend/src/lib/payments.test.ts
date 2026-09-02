// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { confirmStripePayment, inferDocumentType, loadScript, mountMercadoPagoBrick, sanitizeDocument } from './payments'

afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals() })
it.each([['123.456.789-09', '12345678909'], ['12.345.678/0001-90', '12345678000190'], ['x abc', '']])('normaliza documento %s', (value, digits) => {
  expect(sanitizeDocument(value)).toBe(digits)
})
it.each([['12345678909', 'CPF'], ['12345678000190', 'CNPJ'], ['', null], ['1234', null]])('identifica tipo pelo tamanho: %s', (digits, type) => {
  expect(inferDocumentType(digits)).toBe(type)
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
  await mountMercadoPagoBrick({ publicKey: 'pk-test', amount: 25, email: 'a@test.dev', document: '123.456.789-09', containerId: 'checkout', onSubmit, onReady, onError })
  const config = create.mock.calls[0][2]
  expect(config.initialization.payer.identification).toEqual({ type: 'CPF', number: '12345678909' })
  await config.callbacks.onSubmit({ formData: { token: 'opaque' } })
  expect(onSubmit).toHaveBeenCalledWith({ token: 'opaque' })
  config.callbacks.onReady()
  expect(onReady).toHaveBeenCalledOnce()
  config.callbacks.onError({ message: 'Recusado' })
  expect(onError).toHaveBeenCalledWith('Recusado')
})
