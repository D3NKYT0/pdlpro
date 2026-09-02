const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dates = {
  short: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  medium: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }),
}

/** Formatação de exibição; cálculos monetários continuam no domínio/API. */
export function formatCurrency(value: string | number | null | undefined) {
  return money.format(Number(value) || 0)
}
export function formatDateTime(value: string | null | undefined, style: 'short' | 'medium' = 'medium') {
  if (!value) return 'Data indisponível'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : dates[style].format(date)
}
