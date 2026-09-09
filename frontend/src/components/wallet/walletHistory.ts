import type { ApiPaymentOrder, ApiWalletTransaction } from '../../services/types'

const orderStatusLabels: Record<string, string> = {
  pending: 'Aguardando',
  processing: 'Processando',
  confirmed: 'Confirmado',
  paid: 'Pago',
  failed: 'Falhou',
  cancelled: 'Cancelado',
}

export function formatWalletMoney(value: string, currency: 'BRL' | 'USD') {
  const amount = Number(value)
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatWalletDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR')
}

export function getOrderStatus(status: string) {
  const normalized = status.toLowerCase()
  const modifier = ['confirmed', 'paid'].includes(normalized)
    ? 'is-success'
    : ['failed', 'cancelled'].includes(normalized)
      ? 'is-danger'
      : 'is-pending'
  return { label: orderStatusLabels[normalized] ?? status, modifier }
}

export function getTransactionPresentation(kind: string, amount: string) {
  const numericAmount = Number(amount)
  const outgoing = numericAmount < 0 || /(saida|saída|debit|out|withdraw|purchase|spent|send)/i.test(kind)
  const absoluteAmount = Number.isFinite(numericAmount) ? Math.abs(numericAmount).toFixed(2) : amount
  return {
    outgoing,
    amount: `${outgoing ? '−' : '+'}${absoluteAmount} moedas`,
  }
}

export function orderDetailEntries(order: ApiPaymentOrder) {
  const currency = order.currency === 'USD' ? 'USD' : 'BRL'
  return [
    ['Status', getOrderStatus(order.status).label],
    ['Moedas', `${order.coins} moedas`],
    ['Valor', formatWalletMoney(order.amount, currency)],
    ['Método', order.method || '—'],
    ['Pacote', order.package_code || 'Personalizado'],
    ['Bônus aplicado', order.bonus_applied || '0.00'],
    ['Total creditado', order.total_credited || '0.00'],
    ['Criado em', formatWalletDate(order.created_at)],
    ['Pago em', formatWalletDate(order.paid_at)],
    ['PIX', order.pix_qr_code || '—'],
    ['Boleto', order.boleto_barcode || order.boleto_url || '—'],
    ['Mensagem', order.gateway_message || '—'],
    ['Identificador', order.id],
  ] as const
}

export function transactionDetailEntries(row: ApiWalletTransaction) {
  const presentation = getTransactionPresentation(row.kind, row.amount)
  return [
    ['Tipo', row.kind],
    ['Valor', presentation.amount],
    ['Descrição', row.description || '—'],
    ['Origem', row.origin || '—'],
    ['Destino', row.destination || '—'],
    ['Data', formatWalletDate(row.created_at)],
    ['Identificador', row.id],
  ] as const
}
