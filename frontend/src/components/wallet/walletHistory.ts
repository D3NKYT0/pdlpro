import type { ApiPaymentOrder, ApiWalletTransaction } from '../../services/types'
import { formatCurrency, formatDateTime } from '../../lib/formatters'

/** Tradutor do namespace `panel` recebido pelas telas da carteira. */
export type WalletTranslate = (key: string, options?: Record<string, unknown>) => string

const orderStatusKeys = ['pending', 'processing', 'confirmed', 'paid', 'failed', 'cancelled']

export function formatWalletMoney(value: string, currency: 'BRL' | 'USD') {
  return formatCurrency(value, currency)
}

export function formatWalletDate(value?: string | null) {
  if (!value) return '—'
  return formatDateTime(value)
}

export function getOrderStatus(status: string, t: WalletTranslate) {
  const normalized = status.toLowerCase()
  const modifier = ['confirmed', 'paid'].includes(normalized)
    ? 'is-success'
    : ['failed', 'cancelled'].includes(normalized)
      ? 'is-danger'
      : 'is-pending'
  const label = orderStatusKeys.includes(normalized) ? t(`wallet.status.${normalized}`) : status
  return { label, modifier }
}

export function getTransactionPresentation(kind: string, amount: string, t: WalletTranslate) {
  const numericAmount = Number(amount)
  const outgoing = numericAmount < 0 || /(saida|saída|debit|out|withdraw|purchase|spent|send)/i.test(kind)
  const absoluteAmount = Number.isFinite(numericAmount) ? Math.abs(numericAmount).toFixed(2) : amount
  return {
    outgoing,
    amount: t('wallet.transactionAmount', { sign: outgoing ? '−' : '+', amount: absoluteAmount }),
  }
}

export function orderDetailEntries(order: ApiPaymentOrder, t: WalletTranslate) {
  const currency = order.currency === 'USD' ? 'USD' : 'BRL'
  return [
    [t('wallet.detail.status'), getOrderStatus(order.status, t).label],
    [t('wallet.detail.coins'), t('wallet.detail.coinsValue', { coins: order.coins })],
    [t('wallet.detail.amount'), formatWalletMoney(order.amount, currency)],
    [t('wallet.detail.method'), order.method || '—'],
    [t('wallet.detail.package'), order.package_code || t('wallet.detail.packageCustom')],
    [t('wallet.detail.bonusApplied'), order.bonus_applied || '0.00'],
    [t('wallet.detail.totalCredited'), order.total_credited || '0.00'],
    [t('wallet.detail.createdAt'), formatWalletDate(order.created_at)],
    [t('wallet.detail.paidAt'), formatWalletDate(order.paid_at)],
    [t('wallet.detail.pix'), order.pix_qr_code || '—'],
    [t('wallet.detail.boleto'), order.boleto_barcode || order.boleto_url || '—'],
    [t('wallet.detail.message'), order.gateway_message || '—'],
    [t('wallet.detail.id'), order.id],
  ] as const
}

export function transactionDetailEntries(row: ApiWalletTransaction, t: WalletTranslate) {
  const presentation = getTransactionPresentation(row.kind, row.amount, t)
  return [
    [t('wallet.detail.kind'), row.kind],
    [t('wallet.detail.amount'), presentation.amount],
    [t('wallet.detail.description'), row.description || '—'],
    [t('wallet.detail.origin'), row.origin || '—'],
    [t('wallet.detail.destination'), row.destination || '—'],
    [t('wallet.detail.date'), formatWalletDate(row.created_at)],
    [t('wallet.detail.id'), row.id],
  ] as const
}
