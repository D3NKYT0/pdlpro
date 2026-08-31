import { request } from '../infra/http'

export interface ApiVapid {
  public_key: string
  enabled: boolean
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export const pushApi = {
  vapid: () => request<ApiVapid>('/customer/push/vapid/'),
  subscribe: (subscription: PushSubscriptionJSON) =>
    request<{ subscribed: boolean }>('/customer/push/subscribe/', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),
  unsubscribe: (endpoint: string) =>
    request<{ deleted: number }>('/customer/push/subscribe/', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }),
}

export async function enableBrowserPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador não suporta notificações push.')
  }
  const vapid = await pushApi.vapid()
  if (!vapid.enabled || !vapid.public_key) {
    throw new Error('O servidor ainda não está configurado para enviar push.')
  }
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação negada.')
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid.public_key),
  })
  await pushApi.subscribe(subscription.toJSON())
  return true
}

export async function disableBrowserPush() {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await pushApi.unsubscribe(subscription.endpoint)
    await subscription.unsubscribe()
  }
}
