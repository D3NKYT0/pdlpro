// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { disableBrowserPush, enableBrowserPush, pushApi } from './push.service'

let register: ReturnType<typeof vi.fn>, permission: ReturnType<typeof vi.fn>, subscribe: ReturnType<typeof vi.fn>, unsubscribe: ReturnType<typeof vi.fn>
beforeEach(() => {
  const subscription = { endpoint: 'https://push.test/key', toJSON: () => ({ endpoint: 'https://push.test/key' }), unsubscribe: vi.fn().mockResolvedValue(true) }
  unsubscribe = subscription.unsubscribe
  subscribe = vi.fn().mockResolvedValue(subscription)
  const registration = { pushManager: { subscribe, getSubscription: vi.fn().mockResolvedValue(subscription) } }
  register = vi.fn().mockResolvedValue(registration)
  vi.stubGlobal('navigator', { serviceWorker: { register, ready: Promise.resolve(registration), getRegistration: vi.fn().mockResolvedValue(registration) } })
  vi.stubGlobal('PushManager', class {})
  permission = vi.fn().mockResolvedValue('granted')
  vi.stubGlobal('Notification', { requestPermission: permission })
  vi.spyOn(pushApi, 'vapid').mockResolvedValue({ enabled: true, public_key: '-_8A' })
  vi.spyOn(pushApi, 'subscribe').mockResolvedValue({ subscribed: true })
  vi.spyOn(pushApi, 'unsubscribe').mockResolvedValue({ deleted: 1 })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('registra worker, pede permissão e persiste assinatura', async () => {
  await expect(enableBrowserPush()).resolves.toBe(true)
  expect(register).toHaveBeenCalledWith('/sw.js')
  expect(subscribe.mock.calls[0][0]).toEqual({ userVisibleOnly: true, applicationServerKey: new Uint8Array([251, 255, 0]) })
  expect(pushApi.subscribe).toHaveBeenCalledWith({ endpoint: 'https://push.test/key' })
})
it.each(['denied', 'default'])('não inscreve quando permissão é %s', async status => {
  permission.mockResolvedValue(status)
  await expect(enableBrowserPush()).rejects.toThrow('Permissão de notificação negada')
  expect(subscribe).not.toHaveBeenCalled()
  expect(pushApi.subscribe).not.toHaveBeenCalled()
})
it('rejeita navegador incompatível antes de consultar servidor', async () => {
  vi.stubGlobal('navigator', {})
  await expect(enableBrowserPush()).rejects.toThrow('não suporta')
  expect(pushApi.vapid).not.toHaveBeenCalled()
})
it('não registra worker quando VAPID está desativado', async () => {
  vi.mocked(pushApi.vapid).mockResolvedValue({ enabled: false, public_key: '' })
  await expect(enableBrowserPush()).rejects.toThrow('não está configurado')
  expect(register).not.toHaveBeenCalled()
})
it('remove inscrição no servidor e navegador', async () => {
  await disableBrowserPush()
  expect(pushApi.unsubscribe).toHaveBeenCalledWith('https://push.test/key')
  expect(unsubscribe).toHaveBeenCalledOnce()
})
it('desativar sem worker é uma operação sem efeito', async () => {
  vi.mocked(navigator.serviceWorker.getRegistration).mockResolvedValue(undefined)
  await disableBrowserPush()
  expect(pushApi.unsubscribe).not.toHaveBeenCalled()
})
